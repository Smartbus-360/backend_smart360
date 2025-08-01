import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../utils/error.js";
import Institute from "../models/institute.model.js";
import sequelize from '../config/database.js';
import crypto from 'crypto';
import { count } from "console";

export const getAdmins = async (req, res, next) => {
  try {
    // Raw SQL query to fetch admins along with their institute information
    const [admins, metadata] = await sequelize.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.profilePicture,
        u.instituteId,
        u.phone,
        u.gender,
        u.dateOfBirth,
        u.address,
        u.role,
        u.emergency_contact_info,
        u.nationality,
        i.name AS instituteName,
        i.institutionType,
        i.instituteCode
      FROM 
        tbl_sm360_users u
      LEFT JOIN 
        tbl_sm360_institutes i ON u.instituteId = i.id
      WHERE 
        u.isAdmin = 2
    `);

    res.status(200).json(admins);
  } catch (error) {
    next(error);
  }
};

export const addAdmins = async (req, res, next) => {
  const {
    username,
    email,
    password,
    phone,
    gender,
    dateOfBirth,
    address,
    role,
    emergency_contact_info,
    nationality,
    instituteId,
  } = req.body;

  // Validate required fields
  if (
    !username ||
    !email ||
    !password ||
    !phone
  ) {
    return next(errorHandler(400, "All fields are required"));
  }

  try {
    // Check if instituteId is valid
    const institute = await Institute.findByPk(instituteId, {
      attributes: ['name']
    });
    if (!institute) {
      return next(errorHandler(400, "Invalid instituteId"));
    }

    // Sanitize input values by converting empty strings to null
    const validatedPhone = phone === '' ? null : phone;
    const validatedGender = gender === '' ? null : gender;
    const validatedAddress = address === '' ? null : address;
    const validatedRole = role === '' ? null : role;
    const validatedEmergencyContactInfo = emergency_contact_info === '' ? null : emergency_contact_info;
    const validatedNationality = nationality === '' ? null : nationality;
    const validatedDateOfBirth = dateOfBirth === '' ? null : dateOfBirth;

    const hashedPassword = bcryptjs.hashSync(password, 12);
    const profilePicture = req.body.profilePicture || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      profilePicture,
      phone: validatedPhone,
      gender: validatedGender,
      dateOfBirth: validatedDateOfBirth,
      address: validatedAddress,
      role: validatedRole,
      emergency_contact_info: validatedEmergencyContactInfo,
      nationality: validatedNationality,
      isAdmin: 2,
      instituteId: instituteId,
    });

    await newUser.save();
    const { password: pass, ...userWithoutPassword } = newUser.dataValues;
    res.status(201).json({
      success: true,
      message: "Admin successfully added",
      admin: {
        ...userWithoutPassword,
        instituteName: institute?.name || null,
      },
    });
  } catch (error) {
    next(errorHandler(500, "Failed to add admin"));
  }
};


export const updateAdmin = async (req, res, next) => {
  const { id } = req.params;
  const {
    username,
    email,
    password,
    phone,
    gender,
    dateOfBirth,
    address,
    role,
    emergency_contact_info,
    nationality,
    instituteId,
  } = req.body;

  // Validate required fields
  if (
    !username ||
    !email ||
    !phone
  ) {
    return next(errorHandler(400, "All fields are required"));
  }

  // Sanitize input values by converting empty strings to null
  const validatedPhone = phone === '' ? null : phone;
  const validatedGender = gender === '' ? null : gender;
  const validatedAddress = address === '' ? null : address;
  const validatedRole = role === '' ? null : role;
  const validatedEmergencyContactInfo = emergency_contact_info === '' ? null : emergency_contact_info;
  const validatedNationality = nationality === '' ? null : nationality;
  const validatedDateOfBirth = dateOfBirth === '' ? null : dateOfBirth;

  try {
    const updatedAdmin = await User.findByPk(id);
    if (!updatedAdmin) {
      return next(errorHandler(404, "Admin not found."));
    }

    if (password) {
      const isSamePassword = bcryptjs.compareSync(password, updatedAdmin.password);
      if (!isSamePassword) {
        updatedAdmin.password = bcryptjs.hashSync(password, 12);
      }
    }
    
    // Assign other fields
    updatedAdmin.username = username;
    updatedAdmin.email = email;
    updatedAdmin.phone = validatedPhone;
    updatedAdmin.gender = validatedGender;
    updatedAdmin.dateOfBirth = validatedDateOfBirth;
    updatedAdmin.address = validatedAddress;
    updatedAdmin.role = validatedRole;
    updatedAdmin.emergency_contact_info = validatedEmergencyContactInfo;
    updatedAdmin.nationality = validatedNationality;
    updatedAdmin.instituteId = instituteId;
    
    await updatedAdmin.save();

    const institute = await Institute.findByPk(instituteId, {
      attributes: ['name']
    });

    res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      admin: {
        id: updatedAdmin.id,
        username: updatedAdmin.username,
        email: updatedAdmin.email,
        phone: updatedAdmin.phone,
        gender: updatedAdmin.gender,
        dateOfBirth: updatedAdmin.dateOfBirth,
        address: updatedAdmin.address,
        role: updatedAdmin.role,
        emergency_contact_info: updatedAdmin.emergency_contact_info,
        nationality: updatedAdmin.nationality,
        isAdmin: updatedAdmin.isAdmin,
        instituteId: updatedAdmin.instituteId,
        instituteName: institute?.name || null,
      },
    });
  } catch (error) {
    next(error);
  }
};


export const deleteAdmin = async (req, res, next) => {
  const { id } = req.params;
  try {
    const deletedAdmin = await User.destroy({ where: { id } });
    if (!deletedAdmin) {
      return res.status(404).json({ message: "Admin not found." });
    }
    res.json({ message: "Admin deleted successfully." });
  } catch (error) {
    console.error("Error deleting admin:", error);
    res.status(500).json({ message: "Failed to delete admin." });
  }
};

export const searchAdmins = async (req, res, next) => {
  const { query } = req.query; // Expecting query as a string
  const userId = req.user.id; // Get current user's id from token

  try {
    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { isAdmin, instituteId } = user;
    const results = {
      users: [],
      drivers: [],
      buses: [],
      institutes: [] // Add this line if you're checking for super admin
    };

    if (isAdmin === 1) {
      // Super admin // OR code LIKE :query
      const institutes = await sequelize.query(`
        SELECT 
          i.id AS instituteId, i.name AS instituteName, i.website AS instituteWebsite, i.city AS instituteCity, i.logo AS instituteLogo,
          d.id AS driverId, d.name AS driverName, d.phone AS driverPhone, d.licenseNumber AS driverLicenseNumber,
          b.id AS busId, b.busNumber AS busNumber, b.capacity AS busCapacity, b.licensePlate AS busLicensePlate,
          u.id AS userId, u.full_name AS userFullName, u.username AS userName, u.email AS userEmail,
          r.id AS routeId, r.routeName AS routeName, r.startLocation AS routeStart, r.endLocation AS routeEnd,
          s.id AS stopId, s.stopName AS stopName, s.latitude AS stopLatitude, s.longitude AS stopLongitude
        FROM tbl_sm360_institutes AS i
        LEFT JOIN tbl_sm360_drivers AS d ON i.id = d.instituteId
        LEFT JOIN tbl_sm360_buses AS b ON d.id = b.driverId
        LEFT JOIN tbl_sm360_users AS u ON i.id = u.instituteId
        LEFT JOIN tbl_sm360_routes AS r ON i.id = r.instituteId
        LEFT JOIN tbl_sm360_stops AS s ON r.id = s.routeId
        WHERE i.name LIKE :query 
      `, {
        replacements: { query: `%${query}%` },
        type: sequelize.QueryTypes.SELECT,
      });

      const response = {
        institutes: institutes.filter((institute, index, self) => {
          // Deduplicate institutes based on instituteId
          return self.findIndex(item => item.instituteId === institute.instituteId) === index;
        }).map(institute => {
          // Deduplicate drivers
          const uniqueDrivers = [];
          const driverIds = new Set();
          institutes
            .filter(item => item.instituteId === institute.instituteId && item.driverId)
            .forEach(driver => {
              if (!driverIds.has(driver.driverId)) {
                uniqueDrivers.push({
                  id: driver.driverId,
                  name: driver.driverName,
                  phone: driver.driverPhone,
                  licenseNumber: driver.driverLicenseNumber,
                });
                driverIds.add(driver.driverId); // Add to Set to prevent duplicates
              }
            });
      
          // Deduplicate buses
          const uniqueBuses = [];
          const busIds = new Set();
          institutes
            .filter(item => item.instituteId === institute.instituteId && item.busId)
            .forEach(bus => {
              if (!busIds.has(bus.busId)) {
                uniqueBuses.push({
                  id: bus.busId,
                  number: bus.busNumber,
                  capacity: bus.capacity,
                  licensePlate: bus.licensePlate,
                });
                busIds.add(bus.busId); // Add to Set to prevent duplicates
              }
            });
      
          // Deduplicate users
          const uniqueUsers = [];
          const userIds = new Set();
          institutes
            .filter(item => item.instituteId === institute.instituteId && item.userId)
            .forEach(user => {
              if (!userIds.has(user.userId)) {
                uniqueUsers.push({
                  id: user.userId,
                  fullName: user.userFullName,
                  username: user.userName,
                  email: user.userEmail,
                });
                userIds.add(user.userId); // Add to Set to prevent duplicates
              }
            });
      
          // Deduplicate routes and their stops
          const uniqueRoutes = [];
          const routeIds = new Set();
          institutes
            .filter(item => item.instituteId === institute.instituteId && item.routeId)
            .forEach(route => {
              if (!routeIds.has(route.routeId)) {
                // Deduplicate stops within each route
                const uniqueStops = [];
                const stopIds = new Set();
                institutes
                  .filter(stop => stop.routeId === route.routeId && stop.stopId)
                  .forEach(stop => {
                    if (!stopIds.has(stop.stopId)) {
                      uniqueStops.push({
                        id: stop.stopId,
                        name: stop.stopName,
                        latitude: stop.stopLatitude,
                        longitude: stop.stopLongitude,
                      });
                      stopIds.add(stop.stopId); // Add to Set to prevent duplicates
                    }
                  });
      
                uniqueRoutes.push({
                  id: route.routeId,
                  name: route.routeName,
                  start: route.routeStart,
                  end: route.routeEnd,
                  stops: uniqueStops,
                });
                routeIds.add(route.routeId); // Add to Set to prevent duplicates
              }
            });
      
          // Return structured institute data with deduplicated entities
          return {
            id: institute.instituteId,
            name: institute.instituteName,
            website: institute.instituteWebsite,
            city: institute.instituteCity,
            logo: institute.instituteLogo,
            drivers: uniqueDrivers,
            buses: uniqueBuses,
            users: uniqueUsers,
            routes: uniqueRoutes,
          };
        }),
      };
      
           
      
      results.institutes = response;      
    } else if (isAdmin === 2) {
      // Normal admin
      if (query) {
        // Searching for users
        const userResults = await sequelize.query(`
          SELECT * FROM tbl_sm360_users
          WHERE username LIKE :query AND instituteId = :instituteId AND isAdmin = 0
        `, {
          replacements: { query: `%${query}%`, instituteId: instituteId },
          type: sequelize.QueryTypes.SELECT,
        });
        results.users = userResults;

        // Searching for drivers
        const driverResults = await sequelize.query(`
          SELECT 
            d.id AS driverId,
            d.name AS driverName
          FROM tbl_sm360_drivers d
          WHERE 
            d.name LIKE :query AND d.instituteId = :instituteId
        `, {
          replacements: { query: `%${query}%`, instituteId: instituteId },
          type: sequelize.QueryTypes.SELECT,
        });
        results.drivers = driverResults;

        // Searching for buses
        const busResults = await sequelize.query(`
          SELECT 
            b.id AS busId,
            b.busNumber
          FROM tbl_sm360_buses b
          LEFT JOIN tbl_sm360_drivers d ON b.driverId = d.id
          WHERE 
            b.busNumber LIKE :query AND d.instituteId = :instituteId
        `, {
          replacements: { query: `%${query}%`, instituteId: instituteId },
          type: sequelize.QueryTypes.SELECT,
        });
        results.buses = busResults;
      }
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error("Error in searchAdmins:", error.message); // More specific error log
    return next(errorHandler(500, `Failed to perform search: ${error.message}`));
  }
};
// admin.controller.js
export const addPendingStudent = async (req, res, next) => {
  try {
    const { registrationNumber, instituteCode, stopId } = req.body;

    // 1. Find instituteId from instituteCode
    const [instituteResult] = await sequelize.query(
      "SELECT id FROM tbl_sm360_institutes WHERE instituteCode = :instituteCode",
      {
        replacements: { instituteCode },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!instituteResult || !instituteResult.id) {
      return res.status(400).json({ message: "Invalid institute code" });
    }

    const instituteId = instituteResult.id;

    // 2. Generate unique username
    let baseUsername = `user_${registrationNumber}`;
    let finalUsername = baseUsername;
    let suffix = 1;

    // Check if username exists
    let [existingUser] = await sequelize.query(
      "SELECT username FROM tbl_sm360_users WHERE username = :username",
      {
        replacements: { username: finalUsername },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    while (existingUser) {
      finalUsername = `${baseUsername}_${suffix}`;
      suffix++;

      [existingUser] = await sequelize.query(
        "SELECT username FROM tbl_sm360_users WHERE username = :username",
        {
          replacements: { username: finalUsername },
          type: sequelize.QueryTypes.SELECT,
        }
      );
    }

    const username = finalUsername;
    const email = `${username}@sb360.com`;
    const plainPassword = `pass_${registrationNumber}`;
    const hashedPassword = bcryptjs.hashSync(plainPassword, 12);

    // 3. Insert student
    await sequelize.query(
      `INSERT INTO tbl_sm360_users (
        username, email, password, registrationNumber, instituteId, instituteCode, stopId,
        isAdmin, verified, status, createdAt, updatedAt
      ) VALUES (
        :username, :email, :password, :registrationNumber, :instituteId, :instituteCode, :stopId,
        0, 'no', 'active', NOW(), NOW()
      )`,
      {
        replacements: {
          username,
          email,
          password: hashedPassword,
          registrationNumber,
          instituteId,
          instituteCode,
          stopId: stopId || null,
        },
        type: sequelize.QueryTypes.INSERT,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Student added successfully",
      username,
      email,
    });

  } catch (err) {
    console.error("Add Pending Student Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
// Check if a username already exists
export const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const user = await User.findOne({ where: { username } });

    res.json({ exists: !!user });
  } catch (err) {
    console.error('Error checking username:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
