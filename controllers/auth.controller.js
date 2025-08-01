import User from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import { errorHandler } from '../utils/error.js';
import Route from '../models/route.model.js';
import Stop from '../models/stop.model.js';
import Institute from '../models/institute.model.js';
import JoinUs from "../models/joinUs.model.js";
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sequelize from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

//authentication 
export const signup = async (req, res, next) => {
  const {
    registrationNumber,
    instituteCode,
    username,
    email,
    password,
    profilePicture,
    phone,
    gender,
    dateOfBirth,
    address,
    emergency_contact_info,
    nationality,
  } = req.body;

  if (!registrationNumber || !instituteCode || !username || !email || !password) {
    return next(errorHandler(400, 'All required fields must be filled'));
  }

  try {
    // 1. Check if student record exists and is not verified
    const existingUser = await User.findOne({
      where: {
        registrationNumber,
        instituteCode,
        verified: 'no',
      },
    });

    if (!existingUser) {
      return next(errorHandler(404, 'You are not pre-registered by an admin'));
    }

    // 2. Hash password
    const hashedPassword = bcryptjs.hashSync(password, 12);

    // 3. Update the existing user record with signup details
    await existingUser.update({
      username,
      email,
      password: hashedPassword,
      profilePicture: profilePicture || existingUser.profilePicture,
      phone,
      gender,
      dateOfBirth,
      address,
      emergency_contact_info,
      nationality,
      verified: 'yes', // mark user as registered
    });

    res.status(200).json({ success: true, message: 'Signup successful' });
  } catch (error) {
    next(errorHandler(500, 'Error completing signup'));
  }
};
// Function to generate refresh token securely
const generateRefreshToken = (userId) => {
  const refreshToken = crypto.randomBytes(64).toString('hex'); // Secure random token
  const encryptedToken = crypto.createHmac('sha256', process.env.REFRESH_SECRET).update(refreshToken).digest('hex');
  return { refreshToken, encryptedToken };
};

export const signin = async (req, res, next) => {
    console.log("Login attempt:", req.body); // Confirm it's getting called

  const { email, password, client_id, client_secret } = req.body;

  if (!email || !password || !client_id || !client_secret) {
      return next(errorHandler(400, 'All fields are required'));
  }

  try {
      // Verify Client Credentials
      if (client_id !== process.env.CLIENT_ID || client_secret !== process.env.CLIENT_SECRET) {
          return next(errorHandler(403, 'Invalid client credentials'));
      }

      // Fetch User from Database
const results = await sequelize.query(
  `SELECT u.*, i.id as instituteId, i.name as instituteName 
   FROM tbl_sm360_users u 
   LEFT JOIN tbl_sm360_institutes i ON u.instituteId = i.id 
   WHERE LOWER(u.email) = LOWER(?) AND (u.isAdmin = 1 OR u.isAdmin = 2)`,
  {
    replacements: [email],
    type: sequelize.QueryTypes.SELECT,
  }
);

const validUser = results[0] || null;
      if (!validUser) {
          return next(errorHandler(404, 'User not found or not authorized'));
      }

      // Check Password
      const validPassword = bcryptjs.compareSync(password, validUser.password);
      if (!validPassword) {
          return next(errorHandler(400, 'Invalid password'));
      }

      // Generate Access Token
      const accessToken = jwt.sign(
          { id: validUser.id, isAdmin: validUser.isAdmin,instituteId: validUser.instituteId || null, // include it
 },
          process.env.JWT_SECRET,
          { expiresIn: '8h' } // Short-lived token
      );

      // Generate Refresh Token
      const { refreshToken, encryptedToken } = generateRefreshToken(validUser.id);

      // Store encrypted refresh token in DB
      await sequelize.query(
          `UPDATE tbl_sm360_users SET refreshToken = ? WHERE id = ?`,
          { replacements: [encryptedToken, validUser.id] }
      );

      // Send Tokens
      res.cookie('refreshToken', refreshToken, {
          httpOnly: true, // Prevents XSS
          secure: true, // Only sent over HTTPS
          sameSite: 'None', // cross-origin requests
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
      });

      // Exclude password and return user data
      const { password: pass, ...user } = validUser;
    
      res.status(200).json({ accessToken, user });

  } catch (error) {
      next(error);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return next(errorHandler(403, "Refresh token required"));

    const encryptedToken = crypto.createHmac("sha256", process.env.REFRESH_SECRET)
                                 .update(refreshToken)
                                 .digest("hex");

    const [user] = await sequelize.query(
      `SELECT id, isAdmin FROM tbl_sm360_users WHERE refreshToken = ?`,
      { replacements: [encryptedToken], type: sequelize.QueryTypes.SELECT }
    );

    if (!user) return next(errorHandler(403, "Invalid refresh token"));

    const newAccessToken = jwt.sign(
      { id: user.id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ accessToken: newAccessToken });

  } catch (error) {
    next(error);
  }
};


// export const signin = async (req, res, next) => {
//   const { email, password } = req.body;

//   // Check for missing email or password
//   if (!email || !password) {
//     return next(errorHandler(400, 'All fields are required'));
//   }

//   try {
//     // Direct SQL query to join tbl_sm360_users and tbl_sm360_institutes tables
//     const [results] = await sequelize.query(
//       `SELECT u.*, i.id as instituteId, i.name as instituteName 
//        FROM tbl_sm360_users u 
//        LEFT JOIN tbl_sm360_institutes i ON u.instituteId = i.id 
//        WHERE LOWER(u.email) = LOWER(?) AND (u.isAdmin = 1 OR u.isAdmin = 2)`,
//       { replacements: [email], type: sequelize.QueryTypes.SELECT }
//     );

//     // Log the full query results
//     //console.log('Query Results:', JSON.stringify(results, null, 2));

//     // Directly assign validUser without checking length
//     const validUser = results || null;  // results will be either an object or null

//     //console.log('Valid User:', validUser);
//     if (!validUser) {
//       return next(errorHandler(404, 'User not found or not authorized'));
//     }

//     // Check if the password is valid
//     const validPassword = bcryptjs.compareSync(password, validUser.password);
//     if (!validPassword) {
//       return next(errorHandler(400, 'Invalid password'));
//     }

//     // Create JWT token
//     const token = jwt.sign(
//       { id: validUser.id, isAdmin: validUser.isAdmin },
//       process.env.JWT_SECRET,
//       { expiresIn: '8h' } // Token expiration
//     );

//     // Exclude password and return user data
//     const { password: pass, ...user } = validUser;

//     // Send token and user object in the response
//     res
//       .status(200)
//       .cookie('token', token, {
//         httpOnly: true,
//       })
//       .json({ token, user }); // Respond with token and user details

//   } catch (error) {
//     next(error);
//   }
// };

export const google = async (req, res, next) => {
  const { email, name, googlePhotoUrl } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      const token = jwt.sign(
        { id: user._id, isAdmin: user.isAdmin },
        process.env.JWT_SECRET
      );
      const { password, ...rest } = user._doc;
      res
        .status(200)
        .cookie('access_token', token, {
          httpOnly: true,
        })
        .json(rest);
    } else {
      const generatedPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8);
      const hashedPassword = bcryptjs.hashSync(generatedPassword, 12);
      const newUser = new User({
        username:
          name.toLowerCase().split(' ').join('') +
          Math.random().toString(9).slice(-4),
        email,
        password: hashedPassword,
        profilePicture: googlePhotoUrl,
      });
      await newUser.save();
      const token = jwt.sign(
        { id: newUser._id, isAdmin: newUser.isAdmin },
        process.env.JWT_SECRET
      );
      const { password, ...rest } = newUser._doc;
      res
        .status(200)
        .cookie('access_token', token, {
          httpOnly: true,
        })
        .json(rest);
    }
  } catch (error) {
    next(error);
  }
};
//authentication end

export const getDetails = async (req, res, next) => {
  const userId = req.user.id;

  try {
    // Find user information to determine admin status
    const user = await User.findByPk(userId);
    const isAdmin = Number(user.isAdmin);
    const instituteId = Number(user.instituteId);

    let allData = {
      institutes: [],
      drivers: [],
      users: [],
      routes: [],
      stops: [],
      buses: []
    };

    // SQL queries based on admin status
    if (isAdmin === 0) {
      // If user is not an admin, do not proceed
      return res.status(403).json({ message: "Access denied. You do not have permission to view this data." });
    } else if (isAdmin === 1) {
      // Super Admin: Get all data
      allData.institutes = await sequelize.query('SELECT * FROM tbl_sm360_institutes', {
        type: sequelize.QueryTypes.SELECT,
      });
      allData.drivers = await sequelize.query('SELECT * FROM tbl_sm360_drivers', {
        type: sequelize.QueryTypes.SELECT,
      });
      allData.users = await sequelize.query('SELECT * FROM tbl_sm360_users', {
        type: sequelize.QueryTypes.SELECT,
      });
      allData.routes = await sequelize.query('SELECT * FROM tbl_sm360_routes', {
        type: sequelize.QueryTypes.SELECT,
      });
      allData.stops = await sequelize.query('SELECT * FROM tbl_sm360_stops', {
        type: sequelize.QueryTypes.SELECT,
      });
      allData.buses = await sequelize.query('SELECT * FROM tbl_sm360_buses', {
        type: sequelize.QueryTypes.SELECT,
      });
    } else if (isAdmin === 2) {
      // Normal Admin: Get data for their assigned institute
      allData.institutes = await sequelize.query('SELECT * FROM tbl_sm360_institutes WHERE id = :instituteId', {
        replacements: { instituteId },
        type: sequelize.QueryTypes.SELECT,
      });
      allData.drivers = await sequelize.query('SELECT * FROM tbl_sm360_drivers WHERE instituteId = :instituteId', {
        replacements: { instituteId },
        type: sequelize.QueryTypes.SELECT,
      });
      allData.users = await sequelize.query('SELECT * FROM tbl_sm360_users WHERE instituteId = :instituteId', {
        replacements: { instituteId },
        type: sequelize.QueryTypes.SELECT,
      });
      allData.routes = await sequelize.query('SELECT * FROM tbl_sm360_routes WHERE instituteId = :instituteId', {
        replacements: { instituteId },
        type: sequelize.QueryTypes.SELECT,
      });
      // tbl_sm360_stops and buses will be fetched based on relationships, here’s how:
      allData.stops = await sequelize.query(`
        SELECT s.* FROM tbl_sm360_stops AS s
        JOIN tbl_sm360_routes AS r ON s.routeId = r.id
        WHERE r.instituteId = :instituteId`, {
        replacements: { instituteId },
        type: sequelize.QueryTypes.SELECT,
      });
      allData.buses = await sequelize.query(`
        SELECT b.* FROM tbl_sm360_buses AS b
        JOIN tbl_sm360_drivers AS d ON b.driverId = d.id
        WHERE d.instituteId = :instituteId`, {
        replacements: { instituteId },
        type: sequelize.QueryTypes.SELECT,
      });
    }

    // Respond with structured information
    res.status(200).json(allData);
  } catch (error) {
    console.error("Error fetching details:", error);
    res.status(500).json({ message: `Error fetching details, ${error.message}` });
  }
};

// Get an Institute by ID
export const getInstituteById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const institute = await Institute.findByPk(id);

    if (!institute) {
      return next(errorHandler(404, 'Institute not found'));
    }

    res.status(200).json({
      success: true,
      institute,
    });
  } catch (error) {
    next(error);
  }
};


export const getAllRoutes = async (req, res, next) => {
  const userId = req.user.id;

  try {
    // Fetch the user details
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isAdmin = Number(user.isAdmin);
    const adminInstituteId = Number(user.instituteId);

    // Fetch routes based on admin status
    const routes = isAdmin === 2
      ? await Route.findAll({ where: { instituteId: adminInstituteId } })
      : await Route.findAll();

    res.status(200).json(routes);
  } catch (error) {
    console.error("Error retrieving routes:", error); // For debugging purposes
    res.status(500).json({ message: 'Error retrieving routes', error });
  }
};

// In your routes controller
export const getRoutesByInstitute = async (req, res, next) => {
  const { instituteId } = req.params;

  try {
    // If an instituteId is provided, filter by it; otherwise, fetch all routes.
    const routes = await Route.findAll({
      where: instituteId ? { instituteId } : {},
      attributes: ['id', 'routeName']
    });

    if (routes.length === 0) {
      return res.status(404).json({ message: 'No routes found.' });
    }

    res.status(200).json(routes);
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const addUpdateDriverRoute = async (req, res, next) => {
  const driverRoutes = req.body;

  try {
    for (const route of driverRoutes) {
      const existingRoute = await DriverRoutes.findOne({
        where: {
          driverId: route.driverId,
          routeName: route.routeName,
        },
      });

      if (existingRoute) {
        // Update the existing route
        await existingRoute.update({
          // Include fields you want to update
          routeName: route.routeName,
        });
      } else {
        // Create a new route entry
        await DriverRoutes.create({
          driverId: route.driverId,
          routeName: route.routeName,
        });
      }
    }
    res.status(200).json({ success: true, message: 'Routes updated successfully.' });
  } catch (error) {
    console.error("Error adding or updating driver routes:", error);
    res.status(500).json({ success: false, message: 'Failed to add or update routes.' });
  }
};

export const getStopsByRoute = async (req, res, next) => {
  try {
    const { routeId } = req.query;
    const stops = await Stop.find({ routeId });
    res.status(200).json(stops);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stops', error });
  }
};

export const getEnquiries = async (req, res, next) => {
  try {
    const enquiries = await JoinUs.findAll({
      attributes: [
        "id",
        "full_name",
        "email",
        "mobile_number",
        "institute_name",
        "number_of_buses",
        "address",
        "pincode",
        "description",
        "createdAt",
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(enquiries);
  } catch (error) {
    console.error("Error fetching enquiries:", error);
    res.status(500).json({ error: "Failed to fetch enquiries." });
  }
};

export const joinUs = async (req, res, next) => {
  const {
    fullName,
    email,
    mobile,
    companyName,
    buses,
    address,
    pincode,
    description,
  } = req.body;

  if (
    !fullName ||
    !email ||
    !mobile ||
    fullName.trim() === '' ||
    email.trim() === '' ||
    mobile.trim() === ''
  ) {
    return next(errorHandler(400, 'Required fields are missing.'));
  }

  const newJoinUsEntry = new JoinUs({
    full_name: fullName,
    email,
    mobile_number: mobile,
    institute_name: companyName || '',
    number_of_buses: buses || 0,
    address: address || '',
    pincode: pincode || '',
    description: description || '',
  });

  try {
    await newJoinUsEntry.save();
    res.status(201).json({ success: true, message: 'Your application has been submitted successfully!' });
  } catch (error) {
    next(error);
  }
};
export const studentSelfRegister = async (req, res, next) => {
  const {
    registrationNumber,
    instituteCode,
    username,
    email,
    password,
    full_name,
    phone,
    gender,
    address,
    emergency_contact_info,
    dateOfBirth,
    nationality,
  } = req.body;

  if (!registrationNumber || !instituteCode || !username || !email || !password) {
    return next(errorHandler(400, 'All required fields must be filled'));
  }

  try {
    // Resolve instituteId using instituteCode
    const [institute] = await sequelize.query(
      `SELECT id FROM tbl_sm360_institutes WHERE instituteCode = :instituteCode`,
      {
        replacements: { instituteCode },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!institute || !institute.id) {
      return next(errorHandler(400, 'Invalid institute code'));
    }

    const instituteId = institute.id;

    // Look up pending student
    const [existing] = await sequelize.query(
      `SELECT * FROM tbl_sm360_users 
       WHERE registrationNumber = :registrationNumber 
         AND instituteId = :instituteId 
         AND isAdmin = 0`,
      {
        replacements: { registrationNumber, instituteId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!existing) {
      return next(errorHandler(404, 'No matching pending student found'));
    }

    if (existing.verified === 'yes') {
      return next(errorHandler(400, 'This student is already registered'));
    }

    // Ensure new username or email isn’t already taken
    const [conflict] = await sequelize.query(
      `SELECT id FROM tbl_sm360_users 
       WHERE (username = :username OR email = :email) AND id != :id`,
      {
        replacements: { username, email, id: existing.id },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (conflict) {
      return next(errorHandler(400, 'Username or email already in use'));
    }
// Sanitize username and password (remove special characters)
const sanitize = (str) => str.replace(/[^a-zA-Z0-9]/g, '');

const cleanUsername = sanitize(username);
const cleanPassword = sanitize(password);

    // Hash password
    const hashedPassword = bcryptjs.hashSync(cleanPassword, 12);

    // Update user record
    await sequelize.query(
      `UPDATE tbl_sm360_users SET 
        username = :registrationNumber,
        email = :email,
        password = :password,
        full_name = :full_name,
        phone = :phone,
        gender = :gender,
        address = :address,
        emergency_contact_info = :emergency_contact_info,
        dateOfBirth = :dateOfBirth,
        nationality = :nationality,
        verified = 'yes',
        status = 'active',
        updatedAt = NOW()
      WHERE registrationNumber = :registrationNumber AND instituteId = :instituteId`,
      {
        replacements: {
          registrationNumber,
          email,
          password: hashedPassword,
          full_name: full_name || null,
          phone: phone || null,
          gender: gender || null,
          address: address || null,
          emergency_contact_info: emergency_contact_info || null,
          dateOfBirth: dateOfBirth || null,
          nationality: nationality || null,
          registrationNumber,
          instituteId,
        },
        type: sequelize.QueryTypes.UPDATE,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Registration complete. You can now log in.',
    });
  } catch (error) {
    console.error('Self-register error:', error);
    next(errorHandler(500, error.message));
  }
};
export const oneTimeLogin = async (req, res, next) => {
  const { registrationNumber, instituteCode } = req.body;

  if (!registrationNumber || !instituteCode) {
    return next(errorHandler(400, 'Registration number and institute code are required'));
  }

  try {
    // Find the unverified user
    const user = await User.findOne({
      where: {
        registrationNumber,
        instituteCode,
        verified: 'no',
      },
    });

    if (!user) {
      return next(errorHandler(404, 'No matching student found or already registered'));
    }

    // Optionally: ensure this is the first/only login
    if (user.status === 'used') {
      return next(errorHandler(403, 'One-time login already used'));
    }

    // Generate short-lived token
    const token = jwt.sign(
      { id: user.id, registrationNumber: user.registrationNumber, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '10m' } // short validity
    );

    // Update user to mark login used (optional)
    await user.update({ status: 'active' });

    res.status(200).json({ success: true, token, message: 'One-time login granted' });
  } catch (error) {
    next(errorHandler(500, error.message));
  }
};
