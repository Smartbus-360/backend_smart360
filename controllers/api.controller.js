import User from "../models/user.model.js";
import {
  getUserToken,
  getDriverToken,
} from "../middleware/wsAuth.middleware.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import dotenv from "dotenv";
import { errorHandler } from "../utils/error.js";
import sequelize from "../config/database.js";
// import { pointToLineDistance, pointToStopDistance } from '../utils/distance.js';
import axios from "axios";
import Stop from "../models/stop.model.js";
import { io } from '../index.js';

// const OSRM_URL = "http://router.project-osrm.org/route/v1/driving";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

export const getUserDetails = async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch user, institute, stop, route, driver, and bus details
    const userSqlQuery = `
        SELECT 
            u.id AS userId,
            u.full_name AS userFullName,
            u.username AS userName,
            u.email AS userEmail,
            u.profilePicture AS userProfilePicture,
            u.phone AS userPhoneNumber,
            u.registrationNumber AS userRegistrationNumber,
            u.payment_status AS userPaymentStatus,
            u.emergency_contact_info AS userEmergencyContactInfo,
            u.dateOfBirth AS userDateOfBirth,
            i.id AS instituteId,
            i.name AS instituteName,
            i.website AS instituteWebsite,
            i.city AS instituteCity,
            i.logo AS instituteLogo,
            i.location AS instituteLocation,
            i.institutionType AS institute_type,
            s.id AS stoppageId,
            s.stopName AS stoppageName,
            s.stopOrder AS stoppageOrder,
            s.latitude AS stoppageLatitude,
            s.longitude AS stoppageLongitude,
            s.landmark AS stoppageLandmark,
            s.estimatedStopDuration AS stoppageStopDuration,
            s.reached AS stoppageReached,
            s.reachDateTime AS stoppageReachDateTime,
            r.id AS routeId,
            r.routeName AS routeName,
            r.startLocation AS routeStart,
            r.endLocation AS routeEnd,
            r.stopSequence AS routeStopSequence,
            r.missedStopsDetails AS routeMissedStops,
            r.currentJourneyPhase AS routeCurrentJourneyPhase,
            r.currentRound AS routeCurrentRound,
            r.finalStopReached AS routeFinalStopReached,
            d.id AS driverId,
            d.name AS driverName,
            d.email AS driverEmail,
            d.phone AS driverPhone,
            d.emergencyContact AS driverEmergencyContact,
            d.address AS driverAddress,
            d.licenseNumber AS driverLicenseNumber,
            d.aadhaarNumber AS driverAadhaarNumber,
            d.licenseExpiry AS driverLicenseExpiry,
            d.profilePicture AS driverProfilePicture,
            b.id AS busId,
            b.busNumber AS busNumber,
            b.capacity AS busCapacity,
            b.licensePlate AS busLicensePlate
        FROM 
            tbl_sm360_users u
        LEFT JOIN 
            tbl_sm360_institutes i ON u.instituteId = i.id
        LEFT JOIN 
            tbl_sm360_stops s ON u.stopId = s.id
        LEFT JOIN 
            tbl_sm360_routes r ON s.routeId = r.id
        LEFT JOIN 
            tbl_sm360_driver_routes dr ON r.id = dr.routeId
        LEFT JOIN 
            tbl_sm360_drivers d ON dr.driverId = d.id
        LEFT JOIN 
            tbl_sm360_buses b ON d.id = b.driverId
        WHERE 
            u.id = :id;
    `;

    // Execute query
    const [userDetails] = await sequelize.query(userSqlQuery, {
      replacements: { id },
      type: sequelize.QueryTypes.SELECT,
    });

    if (!userDetails) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Fetch stops for the user's route
    const stoppagesQuery = `
    SELECT 
      s.stopName,
      s.stopOrder,
      s.latitude,
      s.longitude,
      s.estimatedStopDuration,
      s.arrivalTime,
      s.departureTime,
      s.afternoonarrivalTime,
      s.afternoondepartureTime,
      s.eveningarrivalTime,
      s.eveningdepartureTime,
      s.landmark,
      s.reached,
      s.reachDateTime,
      s.stopType,
      (
        SELECT stopHitCount 
        FROM tbl_sm360_stop_reach_logs AS logs
        WHERE logs.stopId = s.id 
          AND logs.routeId = s.routeId  -- Ensure correct route reference
          AND logs.tripType = r.currentJourneyPhase -- Match current trip phase
          AND logs.reachDate = CURDATE()  -- Consider only today's logs
          AND logs.round = (
            SELECT COALESCE(MAX(round), 1) 
            FROM tbl_sm360_stop_reach_logs 
            WHERE stopId = s.id 
              AND routeId = s.routeId 
              AND reachDate = CURDATE()  -- Get max round for today
          )  
        ORDER BY logs.stopHitCount DESC  -- Highest stop count first
        LIMIT 1
      ) AS stopHitCount,
      s.rounds
    FROM 
        tbl_sm360_stops s
    JOIN tbl_sm360_routes r ON s.routeId = r.id
    WHERE 
        s.routeId = :routeId
    ORDER BY 
        s.stopOrder;
  `;  
      
      const routeStoppages = await sequelize.query(stoppagesQuery, {
        replacements: { 
          routeId: userDetails.routeId
        },
        type: sequelize.QueryTypes.SELECT,
      });

    // Attach base URL for images
    const baseUrl = "https://api.smartbus360.com";
    ["userProfilePicture", "instituteLogo", "driverProfilePicture"].forEach((key) => {
      if (userDetails[key]) {
        userDetails[key] = `${baseUrl}/${userDetails[key]}`;
      }
    });

    res.json({
      success: true,
      user: userDetails,
      routeStoppages,
      missedStops: userDetails.routeMissedStops,
      currentJourneyPhase: userDetails.routeCurrentJourneyPhase,
      finalStopReached: userDetails.routeFinalStopReached,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDriverDetails = async (req, res) => {
  const { id } = req.params;

  try {
    let assignedDriverId = id;
    let effectiveDriverId = id; // this may change if driver is a replacement
    let isReplaced = false;
    let replacedDriverDetails = null;

    // Fetch the bus assigned to the logged-in driver
    const driverBusDetailsQuery = `
      SELECT id, busNumber
      FROM tbl_sm360_buses
      WHERE driverId = :driverId
    `;
    const [driverBusDetails] = await sequelize.query(driverBusDetailsQuery, {
      replacements: { driverId: id },
      type: sequelize.QueryTypes.SELECT,
    });

    if (!driverBusDetails) {
      return res.status(404).json({ success: false, message: "Driver's bus not found" });
    }

    // Get all active replacements
    const replacementQuery = `
      SELECT * 
      FROM tbl_sm360_replaced_buses rb
      WHERE NOW() < DATE_ADD(rb.created_at, INTERVAL rb.duration HOUR)
    `;
    const replacements = await sequelize.query(replacementQuery, {
      type: sequelize.QueryTypes.SELECT,
    });

    // Find if this driver's bus is among replaced or if the driver is a replacement
    const replacement = replacements.find(
      (r) => r.old_bus_id === driverBusDetails.id || r.driver_id === parseInt(id)
    );

    if (replacement) {
      const stillValid = new Date() < new Date(new Date(replacement.created_at).getTime() + replacement.duration * 60 * 60 * 1000);

      if (stillValid) {
        if (replacement.driver_id !== parseInt(id)) {
          // CASE: Original driver is logged in, but has been replaced
          isReplaced = true;

          const replacementDriverQuery = `
            SELECT id, name, email, phone, profilePicture
            FROM tbl_sm360_drivers
            WHERE id = :newDriverId
          `;
          const [replacementDriver] = await sequelize.query(replacementDriverQuery, {
            replacements: { newDriverId: replacement.driver_id },
            type: sequelize.QueryTypes.SELECT,
          });

          if (!replacementDriver) {
            return res.status(404).json({
              success: false,
              message: "Replacement driver details not found.",
            });
          }

          const profilePictureUrl = replacementDriver.profilePicture
            ? `https://api.smartbus360.com/${replacementDriver.profilePicture}`
            : 'https://api.smartbus360.com/default-profile-picture.png';

          replacedDriverDetails = {
            id: replacementDriver.id,
            name: replacementDriver.name,
            email: replacementDriver.email,
            phone: replacementDriver.phone,
            profilePicture: profilePictureUrl,
            replacementStartTime: replacement.created_at,
            replacementDurationHours: replacement.duration,
          };

          return res.status(200).json({
            success: false,
            message: "You are temporarily replaced by another driver.",
            replacedBy: replacedDriverDetails,
          });
        } else {
          // CASE: Replacement driver is logged in — fetch original driver from old_bus_id
          const originalBusQuery = `
            SELECT driverId
            FROM tbl_sm360_buses
            WHERE id = :oldBusId
          `;
          const [originalBus] = await sequelize.query(originalBusQuery, {
            replacements: { oldBusId: replacement.old_bus_id },
            type: sequelize.QueryTypes.SELECT,
          });

          if (originalBus) {
            effectiveDriverId = originalBus.driverId;
          }
        }
      }
    }

    // Get driver/institute/bus details for the logged-in driver (even if replacement)
    const driverSqlQuery = `
      SELECT 
          d.id AS driverId,
          d.name AS driverName,
          d.email AS driverEmail,
          d.phone AS driverPhone,
          d.licenseNumber AS driverLicense,
          d.experienceYears AS driverExperience,
          d.profilePicture AS driverProfilePicture,
          i.id AS instituteId,
          i.name AS instituteName,
          i.website AS instituteWebsite,
          i.city AS instituteCity,
          i.logo AS instituteLogo,
          i.location AS instituteLocation,
          i.institutionType AS institute_type,
          b.id AS busId,
          b.busNumber AS busNumber,
          b.capacity AS busCapacity,
          b.model AS busModel,
          b.licensePlate AS busLicensePlate
      FROM 
          tbl_sm360_drivers d
      LEFT JOIN 
          tbl_sm360_institutes i ON d.instituteId = i.id
      LEFT JOIN 
          tbl_sm360_buses b ON d.id = b.driverId
      WHERE 
          d.id = :assignedDriverId;
    `;
    const [driverDetails] = await sequelize.query(driverSqlQuery, {
      replacements: { assignedDriverId },
      type: sequelize.QueryTypes.SELECT,
    });

    if (!driverDetails) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    // If the driver is a replacement
    if (replacement && replacement.driver_id === parseInt(id)) {
      driverDetails.originalDriverId = effectiveDriverId;
      driverDetails.isReplacedDriver = true;
      const replacedBusQuery = `
        SELECT id, busNumber
        FROM tbl_sm360_buses
        WHERE id = :oldBusId
      `;
      const [replacedBusDetails] = await sequelize.query(replacedBusQuery, {
        replacements: { oldBusId: replacement.old_bus_id },
        type: sequelize.QueryTypes.SELECT,
      });

      // Get replacement (new) bus details
      const replacementBusQuery = `
        SELECT id, busNumber
        FROM tbl_sm360_buses
        WHERE id = :newBusId
      `;
      const [replacementBusDetails] = await sequelize.query(replacementBusQuery, {
        replacements: { newBusId: replacement.new_bus_id },
        type: sequelize.QueryTypes.SELECT,
      });

      // Attach both sets of bus info to response
      if (replacedBusDetails) {
        driverDetails.replacedBusId = replacedBusDetails.id;
        driverDetails.replacedBusNumber = replacedBusDetails.busNumber;
      }

      if (replacementBusDetails) {
        driverDetails.replacementBusId = replacementBusDetails.id;
        driverDetails.replacementBusNumber = replacementBusDetails.busNumber;
      }
    }

    // Get routes and stops for the effective driver
    const routesQuery = `
      SELECT 
          r.id AS routeId,
          r.routeName AS routeName,
          r.startLocation AS routeStart,
          r.endLocation AS routeEnd,
          r.missedStopsDetails AS routeMissedStops,
          r.currentJourneyPhase AS routeCurrentJourneyPhase,
          r.currentRound AS routeCurrentRound,
          r.finalStopReached AS routeFinalStopReached,
          s.id AS stoppageId,
          s.stopName AS stoppageName,
          s.stopOrder as stoppageOrder,
          s.latitude AS stoppageLatitude,
          s.longitude AS stoppageLongitude,
          s.arrivalTime AS stoppageArrivalTime,
          s.departureTime AS stoppageDepartureTime,
          s.afternoonarrivalTime AS afternoonStoppageArrivalTime,
          s.afternoondepartureTime AS afternoonStoppageDepartureTime,
          s.eveningarrivalTime AS eveningStoppageArrivalTime,
          s.eveningdepartureTime AS eveningStoppageDepartureTime,
          s.landmark AS stoppageLandmark,
          s.reached AS stoppageReached,
          s.reachDateTime AS stoppageReachDateTime,
          s.estimatedStopDuration AS stoppageStopDuration,
          s.stopType,
          s.rounds
      FROM 
          tbl_sm360_driver_routes dr
      LEFT JOIN 
          tbl_sm360_routes r ON dr.routeId = r.id
      LEFT JOIN 
          tbl_sm360_stops s ON r.id = s.routeId
      WHERE 
          dr.driverId = :effectiveDriverId
      ORDER BY 
          s.stopOrder;
    `;
    const driverRoutes = await sequelize.query(routesQuery, {
      replacements: { effectiveDriverId },
      type: sequelize.QueryTypes.SELECT,
    });

    // Attach base URLs to images
    const baseUrl = "https://api.smartbus360.com";
    ["driverProfilePicture", "instituteLogo"].forEach((key) => {
      if (driverDetails[key]) {
        driverDetails[key] = `${baseUrl}/${driverDetails[key]}`;
      }
    });

    if (driverRoutes.length > 0) {
      const { routeCurrentJourneyPhase, routeCurrentRound, routeFinalStopReached } = driverRoutes[0];
      driverDetails.routeCurrentJourneyPhase = routeCurrentJourneyPhase;
      driverDetails.routeCurrentRound = routeCurrentRound;
      driverDetails.routeFinalStopReached = routeFinalStopReached;
    }

    res.json({
      success: true,
      driver: driverDetails,
      routes: driverRoutes,
      missedStops: driverRoutes.map((route) => route.routeMissedStops),
      currentJourneyPhase: driverRoutes.map((route) => route.routeCurrentJourneyPhase),
      finalStopReached: driverRoutes.map((route) => route.routeFinalStopReached),
    });

  } catch (error) {
    console.error("Error fetching driver details:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// if (driverRoutes.length > 0) {
//   const groupedRoutes = driverRoutes.reduce((acc, route) => {
//     let existingRoute = acc.find(r => r.routeId === route.routeId);
    
//     if (!existingRoute) {
//       existingRoute = {
//         routeId: route.routeId,
//         routeName: route.routeName,
//         routeStart: route.routeStart,
//         routeEnd: route.routeEnd,
//         routeMissedStops: route.routeMissedStops,
//         routeCurrentJourneyPhase: route.routeCurrentJourneyPhase,
//         routeCurrentRound: route.routeCurrentRound,
//         routeFinalStopReached: route.routeFinalStopReached,
//         stops: []
//       };
//       acc.push(existingRoute);
//     }

//     existingRoute.stops.push({
//       stoppageId: route.stoppageId,
//       stoppageName: route.stoppageName,
//       stoppageOrder: route.stoppageOrder,
//       stoppageLatitude: route.stoppageLatitude,
//       stoppageLongitude: route.stoppageLongitude,
//       stoppageArrivalTime: route.stoppageArrivalTime,
//       stoppageDepartureTime: route.stoppageDepartureTime,
//       afternoonStoppageArrivalTime: route.afternoonStoppageArrivalTime,
//       afternoonStoppageDepartureTime: route.afternoonStoppageDepartureTime,
//       eveningStoppageArrivalTime: route.eveningStoppageArrivalTime,
//       eveningStoppageDepartureTime: route.eveningStoppageDepartureTime,
//       stoppageLandmark: route.stoppageLandmark,
//       stoppageReached: route.stoppageReached,
//       stoppageReachDateTime: route.stoppageReachDateTime,
//       stoppageStopDuration: route.stoppageStopDuration,
//       stopType: route.stopType
//     });

//     return acc;
//   }, []);

//   driverDetails.routeCurrentJourneyPhase = groupedRoutes[0]?.routeCurrentJourneyPhase || null;
//   driverDetails.routeCurrentRound = groupedRoutes[0]?.routeCurrentRound || null;
//   driverDetails.routeFinalStopReached = groupedRoutes[0]?.routeFinalStopReached || null;

//   res.json({
//     success: true,
//     driver: driverDetails,
//     routes: groupedRoutes, // Now each route contains nested stops!
//     missedStops: groupedRoutes.map(route => route.routeMissedStops),
//     currentJourneyPhase: groupedRoutes.map(route => route.routeCurrentJourneyPhase),
//     finalStopReached: groupedRoutes.map(route => route.routeFinalStopReached),
//   });
// }

export const markMissedStop = async (req, res) => {
  const { routeId, stopId } = req.body;
  if (!routeId) {
    return res.status(400).json({ success: false, message: 'Route ID is required.' });
  }
  if (!stopId) {
    return res.status(400).json({ success: false, message: 'Stop ID is required.' });
  }

  const rId = Number(routeId);
  const sId = Number(stopId);
  try {
    // Raw SQL to find the missed stop
    const [missedStop] = await sequelize.query(
      'SELECT stopName FROM tbl_sm360_stops WHERE id = :sId AND routeId = :rId',
      {
        replacements: { sId, rId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // If missedStop is not found
    if (!missedStop) {
      return res.status(404).json({ success: false, message: 'Stop not found for this route.' });
    }

    // Raw SQL to update Route with missed stop
    await sequelize.query(
      'UPDATE tbl_sm360_routes SET missedStopsDetails = CONCAT(missedStopsDetails, ",", :stopName) WHERE id = :rId',
      {
        replacements: { stopName: missedStop.stopName, rId },
        type: sequelize.QueryTypes.UPDATE,
      }
    );

    res.json({ success: true, message: 'Missed stop recorded.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markFinalStopReached = async (req, res) => {
  const { routeId } = req.body;
  if (!routeId) return res.status(400).json({ success: false, message: "Route ID is required." });

  const rId = Number(routeId);
  try {
    const [currentPhaseResult] = await sequelize.query(
      `SELECT currentJourneyPhase, currentRound FROM tbl_sm360_routes WHERE id = :rId`,
      { replacements: { rId }, type: sequelize.QueryTypes.SELECT }
    );

    if (!currentPhaseResult) {
      return res.status(404).json({ success: false, message: "Route not found." });
    }

    let { currentJourneyPhase, currentRound } = currentPhaseResult;
    let nextPhase = currentJourneyPhase;
    let nextRound = currentRound;

    const getAvailablePhases = async () => {
      const stops = await sequelize.query(
        `SELECT DISTINCT stopType FROM tbl_sm360_stops WHERE routeId = :rId`,
        { replacements: { rId }, type: sequelize.QueryTypes.SELECT }
      );
      return stops.map(stop => stop.stopType).filter(Boolean);
    };

    const getAvailableRounds = async (phase) => {
      const stops = await sequelize.query(
        `SELECT rounds FROM tbl_sm360_stops WHERE routeId = :rId AND stopType = :phase`,
        { replacements: { rId, phase }, type: sequelize.QueryTypes.SELECT }
      );
    
      return [...new Set(
        stops.flatMap(stop => {
          try {
            const roundsObj = typeof stop.rounds === 'string'
              ? JSON.parse(stop.rounds || '{}')
              : stop.rounds || {};
    
            return (roundsObj?.[phase] || []).map(r => r.round);
          } catch (e) {
            console.error("Rounds parse error:", stop.rounds);
            return [];
          }
        })
      )].sort((a, b) => a - b);
    };
    const getNextAvailableShift = (currentPhase, availablePhases) => {
      const phaseOrder = ["morning", "afternoon", "evening"];
      const validPhases = phaseOrder.filter(p => availablePhases.includes(p));
      const currentIndex = validPhases.indexOf(currentPhase);
      return validPhases[(currentIndex + 1) % validPhases.length];
    };

    // const resetStopHitCount = async (rId, phase, round) => {
    //   await sequelize.query(
    //     `UPDATE tbl_sm360_stops 
    //      SET reached = 0, reachDateTime = NULL 
    //      WHERE routeId = :rId 
    //      AND stopType = :phase 
    //      AND JSON_EXTRACT(rounds, '$."${phase}"') LIKE CONCAT('%', :round, '%')`,
    //     { replacements: { rId, phase, round }, type: sequelize.QueryTypes.UPDATE }
    //   );
    // };

    const availablePhases = await getAvailablePhases();
    if (!availablePhases.includes(nextPhase)) {
      nextPhase = availablePhases[0];
    }

    let availableRounds = await getAvailableRounds(nextPhase);

    const currentIndex = availableRounds.indexOf(nextRound);
    let prevRound = nextRound;
    
    if (currentIndex === -1 || currentIndex + 1 >= availableRounds.length) {
      // Mark all pending stops as reached before proceeding
      await markPendingStopsAsReached(rId, nextPhase, nextRound);
    
      console.log(`No more rounds in ${nextPhase}. Switching shift.`);
      await resetStopHitCount(rId, currentJourneyPhase, currentRound); // 🔧 fix here
    
      nextPhase = getNextAvailableShift(nextPhase, availablePhases);
      availableRounds = await getAvailableRounds(nextPhase);
    
      if (availableRounds.length === 0) {
        console.log(`Next shift (${nextPhase}) also has no rounds. Resetting to ${availablePhases[0]}.`);
        nextPhase = availablePhases[0];
        availableRounds = await getAvailableRounds(nextPhase);
        await resetStops(rId);
        await resetStopHitCount(rId, currentJourneyPhase, currentRound); // 🔧 fix here
      }
    
      nextRound = availableRounds[0] || 1;
    } else {
      nextRound = availableRounds[currentIndex + 1];
      console.log(`Moving to next round: ${nextRound} in ${nextPhase}`);
      await resetStopHitCount(rId, currentJourneyPhase, currentRound); // 🔧 fix here
    }
    
    // Avoid updating to same phase/round
    if (nextPhase === currentJourneyPhase && nextRound === currentRound) {
      return res.json({
        success: true,
        message: `No further rounds to progress. Journey remains at ${currentJourneyPhase} (Round ${currentRound}).`,
      });
    }

    await sequelize.query(
      `UPDATE tbl_sm360_routes 
       SET currentJourneyPhase = :nextPhase, currentRound = :nextRound 
       WHERE id = :rId`,
      { replacements: { rId, nextPhase, nextRound }, type: sequelize.QueryTypes.UPDATE }
    );

    await sequelize.query(
      `UPDATE tbl_sm360_stops 
       SET reached = 0, reachDateTime = NULL 
       WHERE routeId = :rId 
       AND stopType = :nextPhase 
       AND JSON_EXTRACT(rounds, '$."${nextPhase}"') LIKE CONCAT('%', :nextRound, '%')`,
      { replacements: { rId, nextPhase, nextRound }, type: sequelize.QueryTypes.UPDATE }
    );

    console.log(`✅ Journey updated to ${nextPhase} (Round ${nextRound})`);
    res.json({ success: true, message: `Journey phase updated to ${nextPhase} (Round ${nextRound}).` });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const markPendingStopsAsReached = async (rId, phase, round) => {
  try {
    await sequelize.query(
      `UPDATE tbl_sm360_stops 
       SET reached = 1, reachDateTime = NOW() 
       WHERE routeId = :rId 
       AND stopType = :phase 
       AND JSON_EXTRACT(rounds, '$."${phase}"') LIKE CONCAT('%', :round, '%') 
       AND reached = 0`,
      { replacements: { rId, phase, round }, type: sequelize.QueryTypes.UPDATE }
    );
    console.log(`Marked all pending stops as reached for ${phase} (Round ${round})`);
  } catch (error) {
    console.error("Error marking pending stops as reached:", error.message);
  }
};

// Reset stop hit count
const resetStopHitCount = async (rId, currentPhase, prevRound) => {
  console.log(`Resetting stopHitCount for ${currentPhase} Round ${prevRound}.`);
  const [results] = await sequelize.query(
    `UPDATE tbl_sm360_stop_reach_logs 
     SET stopHitCount = 0 
     WHERE routeId = :rId 
     AND tripType = :currentPhase 
     AND round = :prevRound
     AND DATE(reachDateTime) = CURDATE()`,
    {
      replacements: { rId, currentPhase, prevRound },
      type: sequelize.QueryTypes.UPDATE,
    }
  );
  console.log(`✅ stopHitCount reset for ${currentPhase} Round ${prevRound}: ${results} rows affected.`);
};

// Reset all stops for a route
const resetStops = async (rId) => {
  console.log(`Resetting stops for route ${rId}`);
  await sequelize.query(
    `UPDATE tbl_sm360_stops 
     SET reached = 0, reachDateTime = NULL 
     WHERE routeId = :rId`,
    {
      replacements: { rId },
      type: sequelize.QueryTypes.UPDATE,
    }
  );
};

export const loginUser = async (req, res) => {
  const { email, username, password } = req.body;

  const usernameOrEmail = email || username;

  if (!usernameOrEmail || !password) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Email/Username and password are required",
      });
  }

  try {
    // Authenticate the user and get the token
    const userData = await getUserToken(usernameOrEmail, password);

    // Invalidate existing token for this user
    await sequelize.query(
      `UPDATE tbl_sm360_users SET token = NULL WHERE id = :userId`,
      {
        replacements: { userId: userData.id },
        type: sequelize.QueryTypes.UPDATE,
      }
    );

    // Save the new token in the database
    await sequelize.query(
      `UPDATE tbl_sm360_users SET token = :token WHERE id = :userId`,
      {
        replacements: { token: userData.token, userId: userData.id },
        type: sequelize.QueryTypes.UPDATE,
      }
    );

    res.json({
      success: true,
      token: userData.token,
      userId: userData.id,
      userName: userData.username,
      email: userData.email,
    });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
};

// Driver login route
export const loginDriver = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required" });
  }

  try {
    // Authenticate the driver and get the token
    const driverData = await getDriverToken(email, password);

    // Invalidate existing token for this driver
    await sequelize.query(
      `UPDATE tbl_sm360_drivers SET token = NULL WHERE id = :driverId`,
      {
        replacements: { driverId: driverData.id },
        type: sequelize.QueryTypes.UPDATE,
      }
    );

    // Save the new token in the database
    await sequelize.query(
      `UPDATE tbl_sm360_drivers SET token = :token WHERE id = :driverId`,
      {
        replacements: { token: driverData.token, driverId: driverData.id },
        type: sequelize.QueryTypes.UPDATE,
      }
    );

    res.json({
      success: true,
      token: driverData.token,
      driverId: driverData.id,
      driverName: driverData.name,
      email: driverData.email,
    });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
};

export const logoutUser = async (req, res) => {
  const { userId } = req.body;

  try {
    await sequelize.query(
      `UPDATE tbl_sm360_users SET token = NULL WHERE id = :userId`,
      { replacements: { userId }, type: sequelize.QueryTypes.UPDATE }
    );
    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Driver Signup Route
export const signupDriver = async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    licenseNumber,
    experienceYears,
    profilePicture,
  } = req.body;

  try {
    // Check if the email is already in use
    const existingDriver = await Driver.findOne({ where: { email } });
    if (existingDriver) {
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });
    }

    // Hash the password
    const hashedPassword = bcryptjs.hashSync(password, 12);

    // Create new driver
    const newDriver = await Driver.create({
      name,
      email,
      password: hashedPassword,
      phone,
      licenseNumber,
      experienceYears,
      profilePicture,
    });

    // Generate JWT token for the driver
    const token = jwt.sign(
      { email: newDriver.email, role: "driver" },
      JWT_SECRET,
      { expiresIn: "8h" }
    );
    newDriver.token = token;
    await newDriver.save();

    res
      .status(201)
      .json({
        success: true,
        message: "Driver registered successfully",
        token,
      });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error registering driver",
        error: error.message,
      });
  }
};

// User Signup Route
export const signupUser = async (req, res) => {
  const {
    username,
    email,
    password,
    profilePicture,
    isAdmin,
    institutionType,
    registrationNumber,
  } = req.body;

  try {
    // Check if the email or username is already in use
    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email }, { username }] },
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Username or email already in use" });
    }

    // Hash the password
    const hashedPassword = bcrypt.hashSync(password, 12);

    // Create new user with the corresponding columns
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      profilePicture,
      isAdmin: isAdmin || 0, // default isAdmin to 0 if not provided
      institutionType: institutionType || null, // nullable field
      registrationNumber: registrationNumber || null, // nullable field
    });

    // Generate JWT token for the user
    const token = jwt.sign({ email: newUser.email, role: "user" }, JWT_SECRET, {
      expiresIn: "8h",
    });
    newUser.token = token; // Save the generated token
    await newUser.save();

    // Return success response
    res
      .status(201)
      .json({ success: true, message: "User registered successfully", token });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error registering user",
        error: error.message,
      });
  }
};

export const updateReachDateTime = async (req, res) => {
  const { stoppageId, routeId, reached, reachDateTime, tripType, round } = req.body;

  if (!stoppageId || !routeId || reached === undefined || !reachDateTime || !tripType || !round) {
    return res.status(400).json({
      success: false,
      message: "Required data are missing",
    });
  }

  if (!["morning", "afternoon", "evening"].includes(tripType.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: "Invalid tripType. Must be 'morning', 'afternoon', or 'evening'.",
    });
  }

  try {
    const stoppageToUpdate = await Stop.findByPk(stoppageId);
    if (!stoppageToUpdate) {
      return res.status(400).json({ success: false, message: "Invalid stoppage" });
    }

    const formattedReachDateTime = new Date(reachDateTime);
    if (isNaN(formattedReachDateTime.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid reachDateTime format" });
    }

    // Check if any logs exist for this round on today's date
    const checkIfFirstHit = await sequelize.query(
      `SELECT 1 
       FROM tbl_sm360_stop_reach_logs 
       WHERE stopId = :stopId 
         AND routeId = :routeId 
         AND tripType = :tripType 
         AND round = :round 
         AND DATE(reachDateTime) = CURDATE()
       LIMIT 1;`,
      {
        replacements: { stopId: stoppageId, routeId, tripType, round },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    let stopHitCount = 1;

    if (checkIfFirstHit.length > 0) {
      // Fetch latest hit count
      const latestLog = await sequelize.query(
        `SELECT stopHitCount 
         FROM tbl_sm360_stop_reach_logs 
         WHERE stopId = :stopId 
           AND routeId = :routeId 
           AND tripType = :tripType 
           AND round = :round  
           AND DATE(reachDateTime) = CURDATE() 
         ORDER BY id DESC 
         LIMIT 1;`,
        {
          replacements: { stopId: stoppageId, routeId, tripType, round },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      if (latestLog.length > 0) {
        stopHitCount = parseInt(latestLog[0].stopHitCount, 10) + 1;
      }
    }

    if (parseInt(reached) === 2) {
      // STOP MISSED — Do not increment, just log once with 0 if needed
      const [existingMissedLog] = await sequelize.query(
        `SELECT id FROM tbl_sm360_stop_reach_logs 
         WHERE stopId = :stopId AND routeId = :routeId AND tripType = :tripType 
           AND round = :round AND DATE(reachDateTime) = CURDATE()
         LIMIT 1`,
        {
          replacements: { stopId: stoppageId, routeId, tripType, round },
          type: sequelize.QueryTypes.SELECT,
        }
      );
    
      if (!existingMissedLog) {
        console.log(`Missed stop ${stoppageId} — inserting missed log with stopHitCount = 0`);
        await sequelize.query(
          `INSERT INTO tbl_sm360_stop_reach_logs 
              (stopId, routeId, reachDateTime, tripType, round, stopHitCount, createdAt, updatedAt)
           VALUES 
              (:stopId, :routeId, :reachDateTime, :tripType, :round, 0, NOW(), NOW())`,
          {
            replacements: {
              stopId: stoppageId,
              routeId,
              reachDateTime: formattedReachDateTime,
              tripType: tripType.toLowerCase(),
              round,
            },
            type: sequelize.QueryTypes.INSERT,
          }
        );
      } else {
        console.log(`Missed stop log already exists for stop ${stoppageId}, skipping insert.`);
      }
    
    } else if (parseInt(reached) === 1) {
      // STOP REACHED — Apply normal hit count logic with duplicate check
      let stopHitCount = 1;
    
      const checkIfFirstHit = await sequelize.query(
        `SELECT 1 
         FROM tbl_sm360_stop_reach_logs 
         WHERE stopId = :stopId AND routeId = :routeId AND tripType = :tripType 
           AND round = :round AND DATE(reachDateTime) = CURDATE()
         LIMIT 1;`,
        {
          replacements: { stopId: stoppageId, routeId, tripType, round },
          type: sequelize.QueryTypes.SELECT,
        }
      );
    
      if (checkIfFirstHit.length > 0) {
        const latestLog = await sequelize.query(
          `SELECT stopHitCount 
           FROM tbl_sm360_stop_reach_logs 
           WHERE stopId = :stopId AND routeId = :routeId AND tripType = :tripType 
             AND round = :round AND DATE(reachDateTime) = CURDATE()
           ORDER BY id DESC LIMIT 1;`,
          {
            replacements: { stopId: stoppageId, routeId, tripType, round },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        if (latestLog.length > 0) {
          stopHitCount = parseInt(latestLog[0].stopHitCount, 10) + 1;
        }
      }
    
      // Prevent rapid duplicate inserts
      const [recentHit] = await sequelize.query(
        `SELECT id 
         FROM tbl_sm360_stop_reach_logs 
         WHERE stopId = :stopId AND routeId = :routeId 
           AND tripType = :tripType AND round = :round 
           AND DATE(reachDateTime) = CURDATE()
           AND TIMESTAMPDIFF(SECOND, createdAt, NOW()) <= 30
         ORDER BY id DESC LIMIT 1`,
        {
          replacements: { stopId: stoppageId, routeId, tripType, round },
          type: sequelize.QueryTypes.SELECT,
        }
      );
    
      if (recentHit) {
        console.log(`Duplicate hit detected within 30 seconds. Skipping insert for stop ${stoppageId}.`);
      } else {
        await sequelize.query(
          `INSERT INTO tbl_sm360_stop_reach_logs 
              (stopId, routeId, reachDateTime, tripType, round, stopHitCount, createdAt, updatedAt)
           VALUES 
              (:stopId, :routeId, :reachDateTime, :tripType, :round, :stopHitCount, NOW(), NOW())`,
          {
            replacements: {
              stopId: stoppageId,
              routeId,
              reachDateTime: formattedReachDateTime,
              tripType: tripType.toLowerCase(),
              round,
              stopHitCount,
            },
            type: sequelize.QueryTypes.INSERT,
          }
        );
      }
    }       

    // Update stop status
    stoppageToUpdate.reached = reached;
    stoppageToUpdate.reachDateTime = formattedReachDateTime;
    await stoppageToUpdate.save();

    res.json({
      success: true,
      message: "Reach time recorded successfully.",
      stopHitCount,
      round,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const notifyIfSpeedExceeded = async (req, res) => {
    const { driverId, latitude, longitude, speed, time } = req.body;
    const SPEED_THRESHOLD = 80; // speed limit

    if (speed > SPEED_THRESHOLD) {
        // Emit to the driver-specific room in userNamespace
        io.of("/users").to(`driver_${driverId}`).emit("speedAlert", {
            driverId,
            latitude,
            longitude,
            speed,
            time,
            message: `Driver ${driverId} exceeded speed limit of ${SPEED_THRESHOLD} km/h!`
        });
    }

    return res.status(200).json({ success: true, message: "Speed check complete." });
};

export const getReachTimesForRoute = async (req, res) => {
  const routeId = Number(req.params.route);

  if (!routeId) {
    return res.status(400).json({
      success: false,
      message: "Route ID is required",
    });
  }

  try {
    const reachTimes = await sequelize.query(
      `
        SELECT 
            filtered_data.reachDate,
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'logId', filtered_data.logId,
                    'stopId', filtered_data.stopId,
                    'reachDateTime', filtered_data.reachDateTime,
                    'tripType', filtered_data.tripType,
                    'round', filtered_data.round,
                    'stopName', filtered_data.stopName,
                    'latitude', filtered_data.latitude,
                    'longitude', filtered_data.longitude,
                    'stopOrder', filtered_data.stopOrder,
                    'defaultArrivalTime', filtered_data.defaultArrivalTime,
                    'defaultDepartureTime', filtered_data.defaultDepartureTime,
                    'defaultAfternoonArrivalTime', filtered_data.defaultAfternoonArrivalTime,
                    'defaultAfternoonDepartureTime', filtered_data.defaultAfternoonDepartureTime,
                    'defaultEveningArrivalTime', filtered_data.defaultEveningArrivalTime,
                    'defaultEveningDepartureTime', filtered_data.defaultEveningDepartureTime,
                    'reached', filtered_data.reached,
                    'routeName', filtered_data.routeName,
                    'totalDistance', filtered_data.totalDistance,
                    'estimatedTravelTime', filtered_data.estimatedTravelTime
                )
            ) AS stops
        FROM (
            SELECT 
                MIN(tbl_sm360_stop_reach_logs.id) AS logId,
                tbl_sm360_stop_reach_logs.stopId,
                DATE(tbl_sm360_stop_reach_logs.reachDateTime) AS reachDate,
                MAX(tbl_sm360_stop_reach_logs.reachDateTime) AS reachDateTime,
                tbl_sm360_stop_reach_logs.tripType,
                tbl_sm360_stop_reach_logs.round,
                tbl_sm360_stops.stopName,
                tbl_sm360_stops.latitude,
                tbl_sm360_stops.longitude,
                tbl_sm360_stops.stopOrder,
                tbl_sm360_stops.arrivalTime AS defaultArrivalTime,
                tbl_sm360_stops.departureTime AS defaultDepartureTime,
                tbl_sm360_stops.afternoonarrivalTime AS defaultAfternoonArrivalTime,
                tbl_sm360_stops.afternoondepartureTime AS defaultAfternoonDepartureTime,
                tbl_sm360_stops.eveningarrivalTime AS defaultEveningArrivalTime,
                tbl_sm360_stops.eveningdepartureTime AS defaultEveningDepartureTime,
                tbl_sm360_stops.reached,
                tbl_sm360_routes.routeName,
                tbl_sm360_routes.totalDistance,
                tbl_sm360_routes.estimatedTravelTime
            FROM tbl_sm360_stop_reach_logs
            INNER JOIN tbl_sm360_stops ON tbl_sm360_stop_reach_logs.stopId = tbl_sm360_stops.id
            INNER JOIN tbl_sm360_routes ON tbl_sm360_stops.routeId = tbl_sm360_routes.id
            WHERE tbl_sm360_stop_reach_logs.routeId = :routeId
              AND tbl_sm360_stop_reach_logs.reachDateTime >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)
            GROUP BY 
                tbl_sm360_stop_reach_logs.stopId, 
                DATE(tbl_sm360_stop_reach_logs.reachDateTime),
                tbl_sm360_stop_reach_logs.tripType,
                tbl_sm360_stop_reach_logs.round,
                tbl_sm360_stops.stopName,
                tbl_sm360_stops.latitude,
                tbl_sm360_stops.longitude,
                tbl_sm360_stops.stopOrder,
                tbl_sm360_stops.arrivalTime,
                tbl_sm360_stops.departureTime,
                tbl_sm360_stops.afternoonarrivalTime,
                tbl_sm360_stops.afternoondepartureTime,
                tbl_sm360_stops.eveningarrivalTime,
                tbl_sm360_stops.eveningdepartureTime,
                tbl_sm360_stops.reached,
                tbl_sm360_routes.routeName,
                tbl_sm360_routes.totalDistance,
                tbl_sm360_routes.estimatedTravelTime
        ) AS filtered_data
        GROUP BY filtered_data.reachDate
        ORDER BY filtered_data.reachDate DESC;
      `,
      {
        replacements: { routeId },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    

    res.json({ success: true, data: reachTimes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Utility Functions
// const getNextShift = (currentPhase) => {
//   return currentPhase === "morning"
//     ? "afternoon"
//     : currentPhase === "afternoon"
//     ? "evening"
//     : "morning";
// };