import { errorHandler } from "../utils/error.js";
import Bus from "../models/bus.model.js";
import sequelize from '../config/database.js';
import { Op } from "sequelize"; 
import User from "../models/user.model.js";
import Driver from "../models/driver.model.js";
import Institute from "../models/institute.model.js";
import ReplacedBus from "../models/replace_bus.model.js";

export const getBuses = async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findByPk(userId);
  const isAdmin = Number(user.isAdmin);
  const instituteId = Number(user.instituteId);

  try {
    let query = `
      SELECT 
        b.id AS busId,
        b.*,
        d.id AS driverId,
        d.name AS driverName,
        d.email AS driverEmail,
        d.availabilityStatus,
        d.instituteId,
        i.name AS instituteName,
        i.location AS instituteLocation,
        i.city AS instituteCity,
        i.institutionType,
        b.assignedRouteId AS assignedRouteId
      FROM tbl_sm360_buses b
      JOIN tbl_sm360_drivers d ON b.driverId = d.id
      JOIN tbl_sm360_institutes i ON d.instituteId = i.id
    `;

    if (isAdmin === 1) {
      // Super admin (isAdmin = 1) has access to all buses
    } else if (isAdmin === 2) {
      // Normal admin (isAdmin = 2) restricted by their instituteId
      query += ` WHERE d.instituteId = ?`;
    } else {
      return res.status(403).json({ message: "Access denied." }); // handle unauthorized access
    }

    // Execute the raw SQL query
    const buses = await sequelize.query(query, {
      replacements: isAdmin === 2 ? [instituteId] : [], // instituteId if normal admin
      type: sequelize.QueryTypes.SELECT,
    });

    res.status(200).json(buses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching buses', error });
  }
};



export const addBus = async (req, res, next) => {
  try {
    const {
      busNumber,
      capacity,
      model,
      driverId,
      routeId,
      licensePlate,
      color,
      status,
      fuelType,
      manufactureYear,
      mileage,
      lastServicedDate,
      insuranceExpiryDate,
      assignedRouteId,
    } = req.body;

    const userId = req.user.id;
    const user = await User.findByPk(userId);
    const instituteId = Number(user.instituteId);
    const isAdmin = Number(user.isAdmin);

    // Check if the driver exists and belongs to the same institute
    const driver = await Driver.findByPk(driverId, {
      include: { model: Institute, attributes: ["name"] } // Fetch the institute's name
    });
    
    if (!driver || (isAdmin === 2 && driver.instituteId !== instituteId)) {
      return res.status(403).json({ message: "You do not have permission to add this bus." });
    }
    
    const instituteName = driver.Institute ? driver.Institute.name : null;

    // Convert fields to correct data types (e.g., number, date)
    const capacityValue = Number(capacity); // Ensure capacity is a number
    const mileageValue = Number(mileage); // Ensure mileage is a number
    const assignedRouteIdValue = assignedRouteId && assignedRouteId !== '' ? assignedRouteId : null; // Handle empty string for assignedRouteId
    const busData = {
      busNumber,
      capacity: isNaN(capacityValue) ? null : capacityValue,
      model,
      driverId,
      routeId,
      licensePlate,
      color: color || null,
      status,
      fuelType,
      manufactureYear: manufactureYear || null,
      mileage: isNaN(mileageValue) ? null : mileageValue, 
      lastServicedDate: (new Date(lastServicedDate)).getTime() > 0 ? lastServicedDate : null,
      insuranceExpiryDate: (new Date(insuranceExpiryDate)).getTime() > 0 ? insuranceExpiryDate : null, 
      assignedRouteId: assignedRouteIdValue,
    };

    // Create and save the new bus
    const newBus = new Bus(busData);
    const savedBus = await newBus.save();

    res.status(201).json({
      success: true,
      message: "Bus added successfully",
      bus: {
        id: savedBus.id,
        busNumber: savedBus.busNumber,
        capacity: savedBus.capacity,
        model: savedBus.model,
        driverId: savedBus.driverId,
        licensePlate: savedBus.licensePlate,
        color: savedBus.color,
        status: savedBus.status,
        fuelType: savedBus.fuelType,
        manufactureYear: savedBus.manufactureYear,
        mileage: savedBus.mileage,
        lastServicedDate: savedBus.lastServicedDate,
        insuranceExpiryDate: savedBus.insuranceExpiryDate,
        assignedRouteId: savedBus.assignedRouteId,
        instituteName,
      },
    });
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ message: "Error adding bus", error: error.message || error });
  }
};

export const updateBus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    const isAdmin = Number(user.isAdmin);
    const instituteId = Number(user.instituteId);
    const {
      busNumber,
      capacity,
      model,
      driverId,
      licensePlate,
      color,
      status,
      fuelType,
      manufactureYear,
      mileage,
      lastServicedDate,
      insuranceExpiryDate,
      assignedRouteId,
    } = req.body;


    // Ensure required fields are present
    if (!driverId) {
      return next(errorHandler(400, "Driver is required."));
    }

    const driver = await Driver.findByPk(driverId, {
      include: { model: Institute, attributes: ["name"] } 
    });
    
    if (!driver || (isAdmin === 2 && driver.instituteId !== instituteId)) {
      return res.status(403).json({ message: "You do not have permission to update this bus." });
    }
    
    const instituteName = driver.Institute ? driver.Institute.name : null;

    // Find the bus by ID
    const bus = await Bus.findByPk(id);
    if (!bus) {
      return next(errorHandler(404, "Bus not found."));
    }

    // Update bus properties with additional fields
    bus.busNumber = busNumber;
    bus.capacity = isNaN(capacity) ? null : capacity;
    bus.model = model;
    bus.driverId = driverId;
    bus.licensePlate = licensePlate;
    bus.color = color || null;
    bus.status = status;
    bus.fuelType = fuelType;
    bus.manufactureYear = manufactureYear || null;
    bus.mileage = isNaN(mileage) ? null : mileage;
    bus.lastServicedDate = (new Date(lastServicedDate)).getTime() > 0 ? lastServicedDate : null;
    bus.insuranceExpiryDate = (new Date(insuranceExpiryDate)).getTime() > 0 ? insuranceExpiryDate : null;
    bus.assignedRouteId = assignedRouteId;

    await bus.save();

    res.status(200).json({
      success: true,
      message: "Bus updated successfully",
      bus: {
        id: bus.id,
        busNumber: bus.busNumber,
        capacity: bus.capacity,
        model: bus.model,
        driverId: bus.driverId,
        licensePlate: bus.licensePlate,
        color: bus.color,
        status: bus.status,
        fuelType: bus.fuelType,
        manufactureYear: bus.manufactureYear,
        mileage: bus.mileage,
        lastServicedDate: bus.lastServicedDate,
        insuranceExpiryDate: bus.insuranceExpiryDate,
        assignedRouteId: bus.assignedRouteId,
        instituteName
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBus = async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findByPk(userId);
  const isAdmin = Number(user.isAdmin);
  const instituteId = Number(user.instituteId);

  const { id } = req.params;
  try {
    const bus = await Bus.findByPk(id);
    if (!bus) {
      return res.status(404).json({ message: "Bus not found." });
    }

    const driver = await Driver.findByPk(bus.driverId);
    if (!driver || (isAdmin === 2 && driver.instituteId !== instituteId)) {
      return res.status(403).json({ message: "You do not have permission to delete this bus." });
    }

    await Bus.destroy({ where: { id } });
    res.json({ message: "Bus deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete bus." });
  }
};

export const getReplaceBuses = async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findByPk(userId);
  const isAdmin = Number(user.isAdmin);
  const instituteId = Number(user.instituteId);

  try {
    const replacedBusesQuery = `
      SELECT 
        rb.id AS dbId,
        rb.old_bus_id AS replacedBusId,
        rb.new_bus_id AS busReplacedWithId,
        rb.duration AS duration, 
        rb.reason AS reason,
        replacedBus.busNumber AS replacedBusNumber,
        replacedRoute.routeName AS replacedBusRouteName,
        COALESCE(rb.driver_id, replacedDriver.id) AS replacedBusDriverId,
        COALESCE(replacedDriver.name, 'N/A') AS replacedBusDriverName,
        busReplacedWith.busNumber AS busReplacedWithNumber,
        replacedWithRoute.routeName AS busReplacedWithRouteName,
        COALESCE(rb.driver_id, replacedWithDriver.id) AS busReplacedWithDriverId,
        COALESCE(replacedWithDriver.name, 'N/A') AS busReplacedWithDriverName,
        DATE_ADD(rb.created_at, INTERVAL rb.duration HOUR) AS till
      FROM tbl_sm360_replaced_buses rb
      LEFT JOIN tbl_sm360_buses AS replacedBus ON rb.old_bus_id = replacedBus.id
      LEFT JOIN tbl_sm360_routes AS replacedRoute ON replacedBus.assignedRouteId = replacedRoute.id
      LEFT JOIN tbl_sm360_drivers AS replacedDriver ON replacedBus.driverId = replacedDriver.id
      LEFT JOIN tbl_sm360_buses AS busReplacedWith ON rb.new_bus_id = busReplacedWith.id
      LEFT JOIN tbl_sm360_routes AS replacedWithRoute ON busReplacedWith.assignedRouteId = replacedWithRoute.id
      LEFT JOIN tbl_sm360_drivers AS replacedWithDriver ON rb.driver_id = replacedWithDriver.id
      ${isAdmin === 2 ? 
        `WHERE 
            (replacedDriver.instituteId = ${instituteId} OR 
            replacedWithDriver.instituteId = ${instituteId})` 
        : ''}
    `;

    const replacedBuses = await sequelize.query(replacedBusesQuery, {
      type: sequelize.QueryTypes.SELECT,
    });

    res.status(200).json(replacedBuses);
  } catch (error) {
    console.error("Error fetching replaced buses:", error);
    res.status(500).json({ message: "Error fetching replaced buses", error: error.message });
  }
};

export const addReplaceBus = async (req, res, next) => {
  try {
    const { oldBusId, newBusId, reason, duration, routeId, driverId } = req.body;

    // Insert the replacement bus data
    const replacement = await sequelize.query(
      `INSERT INTO tbl_sm360_replaced_buses (old_bus_id, new_bus_id, reason, duration, route_id, driver_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      {
        replacements: [oldBusId, newBusId, reason, duration, routeId || null, driverId || null],
        type: sequelize.QueryTypes.INSERT,
      }
    );

    res.status(201).json({
      success: true,
      message: "Replacement bus added successfully",
      replacementId: replacement[0],
    });
  } catch (error) {
    res.status(500).json({ message: "Error adding replacement bus", error });
  }
};

export const updateReplaceBus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { oldBusId, newBusId, reason, duration, routeId, driverId } = req.body;

    // Validate required fields
    if (!oldBusId || !newBusId || !duration) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Determine the driverId to use: either from request or fetch from newBusId
    let finalDriverId = driverId;

    if (!finalDriverId) {
      const busDataArray = await sequelize.query(
        `SELECT driverId FROM tbl_sm360_buses WHERE id = ?`,
        {
          replacements: [newBusId],
          type: sequelize.QueryTypes.SELECT,
        }
      );

      const busData = busDataArray[0];
      
      finalDriverId = busData?.driverId || null;
    }

    const replacements = [
      oldBusId,
      newBusId,
      reason || null,
      duration,
      routeId || null,
      finalDriverId,
      id,
    ];

    const [result] = await sequelize.query(
      `UPDATE tbl_sm360_replaced_buses
       SET old_bus_id = ?, 
           new_bus_id = ?, 
           reason = ?, 
           duration = ?, 
           route_id = ?, 
           driver_id = ?
       WHERE id = ?`,
      {
        replacements,
        type: sequelize.QueryTypes.UPDATE,
      }
    );

    if (result === 0) {
      return res.status(404).json({ message: "Replacement bus not found." });
    }

    res.status(200).json({
      success: true,
      message: "Replacement bus updated successfully",
    });
  } catch (error) {
    console.error("Error updating replacement bus:", error);
    res.status(500).json({ message: "Error updating replacement bus", error: error.message });
  }
};




export const deleteReplaceBus = async (req, res, next) => {
  try {
    const { id } = req.params;

    // const deletedRows = await sequelize.query(
    //   `DELETE FROM tbl_sm360_replaced_buses WHERE id = ?`,
    //   { replacements: [id], type: sequelize.QueryTypes.DELETE }
    // );

    // if (deletedRows === 0) {
    //   return res.status(404).json({ message: "Replacement bus not found." });
    // }
    await ReplacedBus.destroy({ where: { id } });
    res.status(200).json({
      success: true,
      message: "Replacement bus deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Error deleting replacement bus", error });
  }
};

export const checkBusReplacement = async (req, res, next) => {
  // Convert busId to integer
  const busId = parseInt(req.params.busId, 10); // Use base 10 for conversion
  const currentDateTime = new Date(); // Get the current date and time

  // Check if busId is a valid number
  if (isNaN(busId)) {
    return res.status(400).json({ error: "Invalid bus ID." });
  }

  try {
    // Raw SQL to check if the bus has been replaced
    const query = `
      SELECT 
        rb.id AS replacement_id,
        rb.route_id AS route_id,
        COALESCE(rb.driver_id, newBus.driverId) AS replacement_driver_id,
        rb.reason AS replacement_reason,
        rb.duration AS replacement_duration,
        rb.created_at AS replacement_created_at,

        -- Old Bus Details
        oldBus.id AS old_bus_id,
        oldBus.busNumber AS old_bus_number,
        oldBus.capacity AS old_bus_capacity,
        oldBus.model AS old_bus_model,
        oldBus.licensePlate AS old_bus_license_plate,
        oldBus.color AS old_bus_color,
        oldBus.status AS old_bus_status,
        oldBus.fuelType AS old_bus_fuel_type,
        oldBus.manufactureYear AS old_bus_manufacture_year,
        oldBus.mileage AS old_bus_mileage,
        oldBus.lastServicedDate AS old_bus_last_serviced_date,
        oldBus.insuranceExpiryDate AS old_bus_insurance_expiry_date,

        -- New Bus Details
        newBus.id AS new_bus_id,
        newBus.busNumber AS new_bus_number,
        newBus.capacity AS new_bus_capacity,
        newBus.model AS new_bus_model,
        newBus.licensePlate AS new_bus_license_plate,
        newBus.color AS new_bus_color,
        newBus.status AS new_bus_status,
        newBus.fuelType AS new_bus_fuel_type,
        newBus.manufactureYear AS new_bus_manufacture_year,
        newBus.mileage AS new_bus_mileage,
        newBus.lastServicedDate AS new_bus_last_serviced_date,
        newBus.insuranceExpiryDate AS new_bus_insurance_expiry_date

      FROM tbl_sm360_replaced_buses rb
      LEFT JOIN tbl_sm360_buses oldBus ON rb.old_bus_id = oldBus.id
      LEFT JOIN tbl_sm360_buses newBus ON rb.new_bus_id = newBus.id
      WHERE (rb.old_bus_id = ? OR rb.new_bus_id = ?)
      AND NOW() BETWEEN rb.created_at AND DATE_ADD(rb.created_at, INTERVAL rb.duration HOUR)
    `;

    // Execute the raw SQL query
    const [replacedBus] = await sequelize.query(query, {
      replacements: [busId, busId],
      type: sequelize.QueryTypes.SELECT,
    });

    // Check if any replaced bus entry was found
    if (replacedBus) { // Directly checking if replacedBus exists
      res.status(200).json({
        status: true,
        message: "Bus has been replaced.",
        replacedBus, // Send back the details of the new bus
      });
    } else {
      res.status(200).json({
        status: false,
        message: "Bus has not been replaced.",
      });
    }
  } catch (error) {
    console.error("Error checking bus replacement:", error);
    res.status(500).json({ error: error });
  }
};

