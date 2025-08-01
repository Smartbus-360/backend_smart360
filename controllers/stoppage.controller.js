import { errorHandler } from "../utils/error.js";
import Stop from "../models/stop.model.js";
import User from "../models/user.model.js";
import Route from "../models/route.model.js";
import Institute from "../models/institute.model.js";
import sequelize from '../config/database.js';

export const getAllStoppages = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId);
    const isAdmin = Number(user.isAdmin);
    const instituteId = user.instituteId;

    // Construct the SQL query
    let query = `
      SELECT s.*, i.name AS instituteName, r.routeName AS routeName
      FROM tbl_sm360_stops s
      JOIN tbl_sm360_routes r ON s.routeId = r.id 
      JOIN tbl_sm360_institutes i ON r.instituteId = i.id
    `;

    if (isAdmin === 2) {
      query += ` WHERE r.instituteId = ?`;
    } else if (isAdmin !== 1) {
      return res.status(403).json({ message: "Access denied." });
    }

    // Execute the query
    const stoppages = await sequelize.query(query, {
      replacements: isAdmin === 2 ? [instituteId] : [],
      type: sequelize.QueryTypes.SELECT,
    });

    // Format the stoppages and update `rounds` if necessary
    const formattedStoppages = await Promise.all(
      stoppages.map(async (stop) => {
        if (stop.rounds) {
          return {
            ...stop,
            rounds: stop.rounds,
          };
        }

        // Step 2: Fallback based on available times and stopType
        let newRounds = { morning: [], afternoon: [], evening: [] };

        if (stop.arrivalTime && stop.stopType === 'morning') {
          newRounds.morning.push({
            round: 1,
            arrivalTime: stop.arrivalTime,
            departureTime: stop.departureTime || null,
          });
        }

        if (stop.afternoonarrivalTime && stop.stopType === 'afternoon') {
          newRounds.afternoon.push({
            round: 1,
            arrivalTime: stop.afternoonarrivalTime,
            departureTime: stop.afternoondepartureTime || null,
          });
        }

        if (stop.eveningarrivalTime && stop.stopType === 'evening') {
          newRounds.evening.push({
            round: 1,
            arrivalTime: stop.eveningarrivalTime,
            departureTime: stop.eveningdepartureTime || null,
          });
        }

        // Step 3: Save new rounds back to the database if created
        if (
          newRounds.morning.length > 0 ||
          newRounds.afternoon.length > 0 ||
          newRounds.evening.length > 0
        ) {
          await sequelize.query(
            `UPDATE tbl_sm360_stops 
             SET rounds = :rounds 
             WHERE id = :id`,
            {
              replacements: {
                rounds: JSON.stringify(newRounds),
                id: stop.id,
              },
              type: sequelize.QueryTypes.UPDATE,
            }
          );
        }

        return {
          ...stop,
          rounds: newRounds,
        };
      })
    );

    res.status(200).json({ success: true, stoppages: formattedStoppages });
  } catch (error) {
    console.error("Error retrieving stoppages:", error);
    res.status(500).json({ message: "Error retrieving stoppages", error });
  }
};


export const addStop = async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findByPk(userId);
  const isAdmin = Number(user.isAdmin);
  const instituteId = Number(user.instituteId);

  try {
    const {
      stopName,
      latitude,
      longitude,
      stopOrder,
      stopType = 'morning',
      estimatedStopDuration = null,
      passengerCount = 0,
      comments = null,
      isAccessible = 'no',
      landmark = null,
      routeId,
      rounds = '{}', // Default to an empty object if not provided
    } = req.body;

    if (!stopName || !latitude || !longitude || !stopOrder || !routeId) {
      return next(errorHandler(400, "All required fields must be provided"));
    }

    const route = await Route.findByPk(routeId, {
      include: { model: Institute, attributes: ["name"] }
    });

    if (!route || (isAdmin === 2 && route.instituteId !== instituteId)) {
      return res.status(403).json({ message: "You do not have permission to add this stop." });
    }

    const instituteName = route.Institute ? route.Institute.name : null;

    // 👉 Convert empty strings to null or default values
    const validatedPassengerCount = passengerCount === "" ? 0 : passengerCount;
    const validatedComments = comments === "" ? null : comments;
    const validatedIsAccessible = isAccessible === "" ? "no" : isAccessible;
    const validatedLandmark = landmark === "" ? null : landmark;

    // 👉 Parse rounds JSON (safe parsing)
    let parsedRounds = {};
    try {
      parsedRounds = typeof rounds === "string" ? JSON.parse(rounds) : rounds;
    } catch (error) {
      console.error("Invalid rounds JSON:", error);
      return next(errorHandler(400, "Invalid rounds format"));
    }

    // ✅ Extract first round for compatibility with existing fields
    const firstMorningRound = parsedRounds?.morning?.[0] || {};
    const firstAfternoonRound = parsedRounds?.afternoon?.[0] || {};
    const firstEveningRound = parsedRounds?.evening?.[0] || {};

    const newStop = new Stop({
      stopName,
      latitude,
      longitude,
      stopOrder,
      stopType,
      estimatedStopDuration: estimatedStopDuration || null,

      // ✅ Store first round times for backward compatibility
      arrivalTime: firstMorningRound.arrivalTime || null,
      departureTime: firstMorningRound.departureTime || null,

      afternoonarrivalTime: firstAfternoonRound.arrivalTime || null,
      afternoondepartureTime: firstAfternoonRound.departureTime || null,

      eveningarrivalTime: firstEveningRound.arrivalTime || null,
      eveningdepartureTime: firstEveningRound.departureTime || null,

      passengerCount: validatedPassengerCount,
      comments: validatedComments,
      isAccessible: validatedIsAccessible,
      landmark: validatedLandmark,
      routeId,

      // ✅ Store full rounds data in the JSON column
      rounds: parsedRounds,
    });

    const savedStop = await newStop.save();

    res.status(201).json({
      success: true,
      message: "Stop added successfully",
      stoppage: {
        id: savedStop.id,
        instituteName,
        stopName: savedStop.stopName,
        latitude: savedStop.latitude,
        longitude: savedStop.longitude,
        stopOrder: savedStop.stopOrder,
        stopType: savedStop.stopType,
        estimatedStopDuration: savedStop.estimatedStopDuration,
        arrivalTime: savedStop.arrivalTime,
        departureTime: savedStop.departureTime,
        afternoonarrivalTime: savedStop.afternoonarrivalTime,
        afternoondepartureTime: savedStop.afternoondepartureTime,
        eveningarrivalTime: savedStop.eveningarrivalTime,
        eveningdepartureTime: savedStop.eveningdepartureTime,
        passengerCount: savedStop.passengerCount,
        comments: savedStop.comments,
        isAccessible: savedStop.isAccessible,
        landmark: savedStop.landmark,
        routeId,
        rounds: savedStop.rounds, // ✅ Return full rounds data
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateStop = async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findByPk(userId);
  const isAdmin = Number(user.isAdmin);
  const instituteId = Number(user.instituteId);

  try {
    const { id } = req.params;
    const {
      stopName,
      latitude,
      longitude,
      stopOrder,
      stopType,
      estimatedStopDuration,
      passengerCount,
      comments,
      isAccessible,
      landmark,
      routeId,
      rounds = '{}', // Default to empty object
    } = req.body;

    if (!stopName || !latitude || !longitude || !stopOrder || !routeId) {
      return next(errorHandler(400, "All required fields must be provided"));
    }

    const route = await Route.findByPk(routeId, {
      include: { model: Institute, attributes: ["name"] }
    });

    if (!route || (isAdmin === 2 && route.instituteId !== instituteId)) {
      return res.status(403).json({ message: "You do not have permission to update this stop." });
    }

    const instituteName = route.Institute ? route.Institute.name : null;

    const updatedStop = await Stop.findByPk(id);
    if (!updatedStop) {
      return next(errorHandler(404, "Stop not found."));
    }

    // 👉 Parse rounds JSON
    let parsedRounds = {};
    try {
      parsedRounds = typeof rounds === 'string' ? JSON.parse(rounds) : rounds;
    } catch (error) {
      console.error("Invalid rounds format:", error);
      return next(errorHandler(400, "Invalid rounds format"));
    }

    // ✅ Extract first round's data for compatibility
    const firstMorningRound = parsedRounds?.morning?.[0] || {};
    const firstAfternoonRound = parsedRounds?.afternoon?.[0] || {};
    const firstEveningRound = parsedRounds?.evening?.[0] || {};

    // ✅ Update fields
    updatedStop.stopName = stopName;
    updatedStop.latitude = latitude;
    updatedStop.longitude = longitude;
    updatedStop.stopOrder = stopOrder;
    updatedStop.stopType = stopType;
    updatedStop.estimatedStopDuration = estimatedStopDuration;
    updatedStop.passengerCount = passengerCount === "" ? 0 : passengerCount;
    updatedStop.comments = comments === "" ? null : comments;
    updatedStop.isAccessible = isAccessible === "" ? "no" : isAccessible;
    updatedStop.landmark = landmark === "" ? null : landmark;
    updatedStop.routeId = routeId;

    // ✅ Update existing fields from the first round
    updatedStop.arrivalTime = firstMorningRound.arrivalTime || null;
    updatedStop.departureTime = firstMorningRound.departureTime || null;

    updatedStop.afternoonarrivalTime = firstAfternoonRound.arrivalTime || null;
    updatedStop.afternoondepartureTime = firstAfternoonRound.departureTime || null;

    updatedStop.eveningarrivalTime = firstEveningRound.arrivalTime || null;
    updatedStop.eveningdepartureTime = firstEveningRound.departureTime || null;

    // ✅ Store full rounds data
    updatedStop.rounds = parsedRounds;

    await updatedStop.save();

    res.status(200).json({
      success: true,
      message: "Stop updated successfully",
      stoppage: {
        id: updatedStop.id,
        instituteName,
        stopName: updatedStop.stopName,
        latitude: updatedStop.latitude,
        longitude: updatedStop.longitude,
        stopOrder: updatedStop.stopOrder,
        stopType: updatedStop.stopType,
        estimatedStopDuration: updatedStop.estimatedStopDuration,
        arrivalTime: updatedStop.arrivalTime,
        departureTime: updatedStop.departureTime,
        afternoonarrivalTime: updatedStop.afternoonarrivalTime,
        afternoondepartureTime: updatedStop.afternoondepartureTime,
        eveningarrivalTime: updatedStop.eveningarrivalTime,
        eveningdepartureTime: updatedStop.eveningdepartureTime,
        passengerCount: updatedStop.passengerCount,
        comments: updatedStop.comments,
        isAccessible: updatedStop.isAccessible,
        landmark: updatedStop.landmark,
        routeId: updatedStop.routeId,
        rounds: updatedStop.rounds, // ✅ Send full rounds data
      },
    });
  } catch (error) {
    next(error);
  }
};


// export const getAllStoppages = async (req, res, next) => {
//   const userId = req.user.id;

//   try {
//     // Retrieve user information to check admin status and institute ID
//     const user = await User.findByPk(userId);
//     const isAdmin = Number(user.isAdmin);
//     const instituteId = user.instituteId; // This may be NULL for super admins

//     // Construct the SQL query
//     let query = `
//       SELECT s.*, i.name AS instituteName
//       FROM tbl_sm360_stops s
//       JOIN tbl_sm360_routes r ON s.routeId = r.id 
//       JOIN tbl_sm360_institutes i ON r.instituteId = i.id
//     `;

//     if (isAdmin === 1) {
//       // Super admin (isAdmin = 1) has access to all stoppages
//       // No additional WHERE clause needed
//     } else if (isAdmin === 2) {
//       // Normal admin (isAdmin = 2) restricted by their instituteId
//       query += ` WHERE r.instituteId = ?`;
//     } else {
//       return res.status(403).json({ message: "Access denied." }); // unauthorized access
//     }

//     // Execute the raw SQL query
//     const stoppages = await sequelize.query(query, {
//       replacements: isAdmin === 2 ? [instituteId] : [],
//       type: sequelize.QueryTypes.SELECT,
//     });

//     res.status(200).json({ success: true, stoppages });
//   } catch (error) {
//     console.error("Error retrieving stoppages:", error);
//     res.status(500).json({ message: "Error retrieving stoppages", error });
//   }
// };

// // Add Stops
// export const addStop = async (req, res, next) => {
//   const userId = req.user.id;
//   const user = await User.findByPk(userId);
//   const isAdmin = Number(user.isAdmin);
//   const instituteId = Number(user.instituteId);

//   try {
//     const {
//       stopName,
//       latitude,
//       longitude,
//       stopOrder,
//       stopType = 'morning', // Default to 'pickup'
//       estimatedStopDuration = null, // Default to null
//       arrivalTime = null, // Default to null if not provided
//       departureTime = null, // Default to null if not provided
//       afternoonarrivalTime = null,
//       afternoondepartureTime = null,
//       eveningarrivalTime = null,
//       eveningdepartureTime = null,
//       passengerCount = 0, // Default to 0 if not provided
//       comments = null, // Default to null if not provided
//       isAccessible = 'no', // Default to 'no'
//       landmark = null, // Default to null if not provided
//       routeId,
//     } = req.body;

//     if (
//       !stopName ||
//       !latitude ||
//       !longitude ||
//       !stopOrder ||
//       !routeId
//     ) {
//       return next(errorHandler(400, "All required fields must be provided"));
//     }

//     const route = await Route.findByPk(routeId, {
//       include: { model: Institute, attributes: ["name"] } // Fetch the institute's name
//     });
    
//     if (!route || (isAdmin === 2 && route.instituteId !== instituteId)) {
//       return res.status(403).json({ message: "You do not have permission to add this stop." });
//     }
    
//     const instituteName = route.Institute ? route.Institute.name : null;

//     // Sanitize input values by converting empty strings to null or default values
//     const validatedArrivalTime = arrivalTime === "" ? null : arrivalTime;
//     const validatedDepartureTime = departureTime === "" ? null : departureTime;
//     const validatedAfternoonarrivalTime = afternoonarrivalTime === "" ? null : afternoonarrivalTime;
//     const validatedAfternoonDepartureTime = afternoondepartureTime === "" ? null : afternoondepartureTime;
//     const validatedEveningArrivalTime = eveningarrivalTime === "" ? null : eveningarrivalTime;
//     const validatedEveningDepartureTime = eveningdepartureTime === "" ? null : eveningdepartureTime;
//     const validatedPassengerCount = passengerCount === "" ? 0 : passengerCount;
//     const validatedComments = comments === "" ? null : comments;
//     const validatedIsAccessible = isAccessible === "" ? "no" : isAccessible;
//     const validatedLandmark = landmark === "" ? null : landmark;

//     const newStop = new Stop({
//       stopName,
//       latitude,
//       longitude,
//       stopOrder,
//       stopType: stopType || 'morning',
//       estimatedStopDuration: estimatedStopDuration || null,
//       arrivalTime: validatedArrivalTime,
//       departureTime: validatedDepartureTime,
//       afternoonarrivalTime: validatedAfternoonarrivalTime,
//       afternoondepartureTime: validatedAfternoonDepartureTime,
//       eveningarrivalTime: validatedEveningArrivalTime,
//       eveningdepartureTime: validatedEveningDepartureTime,
//       passengerCount: validatedPassengerCount,
//       comments: validatedComments,
//       isAccessible: validatedIsAccessible,
//       landmark: validatedLandmark,
//       routeId,
//     });

//     const savedStop = await newStop.save();
//     res.status(201).json({
//       success: true,
//       message: "Stop added successfully",
//       stoppage: {
//         id: savedStop.id,
//         instituteName,
//         stopName: savedStop.stopName,
//         latitude: savedStop.latitude,
//         longitude: savedStop.longitude,
//         stopOrder: savedStop.stopOrder,
//         stopType: savedStop.stopType,
//         estimatedStopDuration: savedStop.estimatedStopDuration,
//         arrivalTime: savedStop.arrivalTime,
//         departureTime: savedStop.departureTime,
//         afternoonarrivalTime: savedStop.afternoonarrivalTime,
//         afternoondepartureTime: savedStop.afternoondepartureTime,
//         eveningarrivalTime: savedStop.eveningarrivalTime,
//         eveningdepartureTime: savedStop.eveningdepartureTime,
//         passengerCount: savedStop.passengerCount,
//         comments: savedStop.comments,
//         isAccessible: savedStop.isAccessible,
//         landmark: savedStop.landmark,
//         routeId: savedStop.routeId,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// export const updateStop = async (req, res, next) => {
//   const userId = req.user.id;
//   const user = await User.findByPk(userId);
//   const isAdmin = Number(user.isAdmin);
//   const instituteId = Number(user.instituteId);

//   try {
//     const { id } = req.params;
//     const {
//       stopName,
//       latitude,
//       longitude,
//       stopOrder,
//       stopType,
//       estimatedStopDuration,
//       arrivalTime,
//       departureTime,
//       afternoonarrivalTime = null,
//       afternoondepartureTime = null,
//       eveningarrivalTime = null,
//       eveningdepartureTime = null,
//       passengerCount,
//       comments,
//       isAccessible,
//       landmark,
//       routeId,
//     } = req.body;

//     if (
//       !stopName ||
//       !latitude ||
//       !longitude ||
//       !stopOrder ||
//       !routeId
//     ) {
//       return next(errorHandler(400, "All required fields must be provided"));
//     }

//     const route = await Route.findByPk(routeId, {
//       include: { model: Institute, attributes: ["name"] }
//     });
    
//     if (!route || (isAdmin === 2 && route.instituteId !== instituteId)) {
//       return res.status(403).json({ message: "You do not have permission to update this stop." });
//     }
    
//     const instituteName = route.Institute ? route.Institute.name : null;

//     const updatedStop = await Stop.findByPk(id);
//     if (!updatedStop) {
//       return next(errorHandler(404, "Stop not found."));
//     }

//     // Sanitize input values by converting empty strings to null
//     const validatedArrivalTime = arrivalTime === "" ? null : arrivalTime;
//     const validatedDepartureTime = departureTime === "" ? null : departureTime;
//     const validatedAfternoonarrivalTime = afternoonarrivalTime === "" ? null : afternoonarrivalTime;
//     const validatedAfternoonDepartureTime = afternoondepartureTime === "" ? null : afternoondepartureTime;
//     const validatedEveningArrivalTime = eveningarrivalTime === "" ? null : eveningarrivalTime;
//     const validatedEveningDepartureTime = eveningdepartureTime === "" ? null : eveningdepartureTime;
//     const validatedPassengerCount = passengerCount === "" ? 0 : passengerCount; // Default to 0 if empty
//     const validatedComments = comments === "" ? null : comments;
//     const validatedIsAccessible = isAccessible === "" ? "no" : isAccessible;
//     const validatedLandmark = landmark === "" ? null : landmark;

//     updatedStop.stopName = stopName;
//     updatedStop.latitude = latitude;
//     updatedStop.longitude = longitude;
//     updatedStop.stopOrder = stopOrder;
//     updatedStop.stopType = stopType;
//     updatedStop.estimatedStopDuration = estimatedStopDuration;
//     updatedStop.arrivalTime = validatedArrivalTime;
//     updatedStop.departureTime = validatedDepartureTime;
//     updatedStop.afternoonarrivalTime = validatedAfternoonarrivalTime,
//     updatedStop.afternoondepartureTime = validatedAfternoonDepartureTime,
//     updatedStop.eveningarrivalTime = validatedEveningArrivalTime,
//     updatedStop.eveningdepartureTime = validatedEveningDepartureTime,
//     updatedStop.passengerCount = validatedPassengerCount;
//     updatedStop.comments = validatedComments;
//     updatedStop.isAccessible = validatedIsAccessible;
//     updatedStop.landmark = validatedLandmark;
//     updatedStop.routeId = routeId;

//     await updatedStop.save();
//     res.status(200).json({
//       success: true,
//       message: "Stop updated successfully",
//       stoppage: {
//         id: updatedStop.id,
//         instituteName,
//         stopName: updatedStop.stopName,
//         latitude: updatedStop.latitude,
//         longitude: updatedStop.longitude,
//         stopOrder: updatedStop.stopOrder,
//         stopType: updatedStop.stopType,
//         estimatedStopDuration: updatedStop.estimatedStopDuration,
//         arrivalTime: updatedStop.arrivalTime,
//         departureTime: updatedStop.departureTime,
//         afternoonarrivalTime: updatedStop.afternoonarrivalTime,
//         afternoondepartureTime: updatedStop.afternoondepartureTime,
//         eveningarrivalTime: updatedStop.eveningarrivalTime,
//         eveningdepartureTime: updatedStop.eveningdepartureTime,
//         passengerCount: updatedStop.passengerCount,
//         comments: updatedStop.comments,
//         isAccessible: updatedStop.isAccessible,
//         landmark: updatedStop.landmark,
//         routeId: updatedStop.routeId,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const deleteStop = async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findByPk(userId);
  const isAdmin = Number(user.isAdmin);
  const instituteId = Number(user.instituteId);

  const { id } = req.params;
  try {
    const stoppage = await Stop.findByPk(id);
    if (!stoppage) {
      return res.status(404).json({ message: "Stoppage not found." });
    }

    const route = await Route.findByPk(stoppage.routeId);
    if (!route || (isAdmin === 2 && route.instituteId !== instituteId)) {
      return res.status(403).json({ message: "You do not have permission to delete this stop." });
    }

    await Stop.destroy({ where: { id } });
    res.json({ message: "Stoppage deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete stoppage." });
  }
};
