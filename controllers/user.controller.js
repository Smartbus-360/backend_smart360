import User from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import { errorHandler } from '../utils/error.js';
import sequelize from '../config/database.js';
import multer from "multer";
import process from 'process';

const baseURL = "https://api.smartbus360.com";

// Configure Multer for handling driver image uploads
const userStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/users"); // Save images in the 'uploads/users' directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Generate a unique filename
  },
});

// Export the Multer instance for driver image uploads
export const uploadUserImage = multer({ storage: userStorage });

// Get Users
export const getAllUsers = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(400).json({ message: 'User information is missing' });
    }

    const userId = req.user.id;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
     const role = Number(user.isAdmin); // role: 1=superadmin, 2=admin, 0=user
   const instituteId = user.instituteId;

        const whereCondition = role === 1
      ? '' // No restriction
      : 'AND u.instituteId = :instituteId'; // Filter by institute for all others

    // Fetch deduplicated users
    const users = await sequelize.query(
      `SELECT u.*, i.name AS instituteName, s.stopName AS stopName, MAX(b.busNumber) AS busNumber
       FROM tbl_sm360_users u
       LEFT JOIN tbl_sm360_institutes i ON u.instituteId = i.id
       LEFT JOIN tbl_sm360_stops s ON u.stopId = s.id
       LEFT JOIN tbl_sm360_driver_routes dr ON s.routeId = dr.routeId
       LEFT JOIN tbl_sm360_drivers d on dr.driverId = d.id
       LEFT JOIN tbl_sm360_buses b on d.id = b.driverId
       WHERE u.isAdmin = 0 
       ${whereCondition}
       GROUP BY u.id, i.name, s.stopName`,
      { 
        replacements: role === 1 ? {} :{ instituteId: instituteId || null },
        type: sequelize.QueryTypes.SELECT 
      }
    );

    // Add profilePicture URL handling
    const baseURL = process.env.BASE_URL || 'https://api.smartbus360.com';
    const usersWithProfilePictureURL = users.map(user => ({
      ...user,
      password: undefined, // Do not expose passwords
      profilePicture: user.profilePicture
        ? user.profilePicture.startsWith("http")
          ? user.profilePicture
          : `${baseURL}/${user.profilePicture}`
        : null,
    }));

    res.status(200).json(usersWithProfilePictureURL);
  } catch (error) {
    console.error('Error retrieving users:', error);
    res.status(500).json({ message: 'Error retrieving users', error: error.message || error });
  }
};

export const addUser = async (req, res, next) => {
  try {
    const {
      username,
      email,
      password,
      gender,
      address,
      phone,
      role,
      registrationNumber,
      emergency_contact_info,
      nationality,
      dateOfBirth,
      institute,
      stop,
    } = req.body;

    // Check for required fields
    if (!username || !email || !password || !institute) {
      return next(errorHandler(400, "Missing required fields"));
    }

    // Check if user already exists
    const existingUser = await sequelize.query(
      "SELECT * FROM tbl_sm360_users WHERE email = :email",
      {
        replacements: { email },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (existingUser.length > 0) {
      return next(errorHandler(400, "User already exists"));
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Fetch instituteCode using instituteId
    const instituteDetails = await sequelize.query(
      "SELECT instituteCode FROM tbl_sm360_institutes WHERE id = :institute",
      {
        replacements: { institute },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!instituteDetails.length || !instituteDetails[0].instituteCode) {
      return next(errorHandler(400, "Institute code not found for the given institute"));
    }

    const instituteCode = instituteDetails[0].instituteCode;

    // Insert user
    await sequelize.query(
      `INSERT INTO tbl_sm360_users 
        (username, email, password, gender, address, phone, role, registrationNumber, emergency_contact_info, nationality, dateOfBirth, instituteId, instituteCode, stopId,status, createdAt, updatedAt)
      VALUES 
        (:username, :email, :password, :gender, :address, :phone, :role, :registrationNumber, :emergency_contact_info, :nationality, :dateOfBirth, :institute, :instituteCode, :stop,'active' NOW(), NOW())`,
      {
        replacements: {
          username,
          email,
          password: hashedPassword,
          gender,
          address,
          phone,
          role,
          registrationNumber,
          emergency_contact_info,
          nationality,
          dateOfBirth,
          institute,
          instituteCode,
          stop,
        },
      }
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully",
    });

  } catch (error) {
    return next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    const isAdmin = Number(user.isAdmin);
    const instituteId = Number(user.instituteId);

    const {
      username,
      email,
      password,
      phone,
      registrationNumber,
      institute,
      stop,
      gender,
      address,
      emergency_contact_info,
      dateOfBirth,
      nationality,
      status,
      verified,
      accountType,
      payment_status,
      notes,
    } = req.body;

    // Check required fields
    if (!username || !email) {
      return next(errorHandler(400, "Username and email are required"));
    }

    // Check if user exists
    const userExists = await sequelize.query(
      "SELECT * FROM tbl_sm360_users WHERE id = :id",
      { replacements: { id }, type: sequelize.QueryTypes.SELECT }
    );
    if (!userExists.length) {
      return next(errorHandler(404, "User not found"));
    }

    if (isAdmin === 2 && userExists[0].instituteId !== instituteId) {
      return next(errorHandler(403, "You are not authorized to update this user."));
    }

    // Check if institute exists
    const instituteRecord = await sequelize.query(
      "SELECT id FROM tbl_sm360_institutes WHERE id = :institute",
      { replacements: { institute }, type: sequelize.QueryTypes.SELECT }
    );
    if (!instituteRecord.length) {
      return next(errorHandler(400, "Invalid institute"));
    }

    // Check if stop exists
    const stopRecord = await sequelize.query(
      "SELECT id FROM tbl_sm360_stops WHERE id = :stop",
      { replacements: { stop }, type: sequelize.QueryTypes.SELECT }
    );
    if (!stopRecord.length) {
      return next(errorHandler(400, "Invalid stoppage"));
    }

    const hashedPassword = password ? bcryptjs.hashSync(password, 12) : undefined;
    // const profilePicture = req.file
    //   ? req.file.path
    //   : userExists[0].profilePicture;

    // Helper function to replace empty strings with null
    const sanitizeInput = (value) => (value === "" ? null : value);

    // Sanitize inputs and ensure all fields are included in replacements
    let replacements = {
      id,
      username,
      email,
      password: hashedPassword || userExists[0].password,
      phone: sanitizeInput(phone),
      registrationNumber: sanitizeInput(registrationNumber),
      gender: sanitizeInput(gender),
      address: sanitizeInput(address),
      emergency_contact_info: sanitizeInput(emergency_contact_info),
      dateOfBirth: sanitizeInput(dateOfBirth),
      nationality: sanitizeInput(nationality),
      status: sanitizeInput(status) || userExists[0].status,
      verified: sanitizeInput(verified) || userExists[0].verified,
      accountType: sanitizeInput(accountType) || userExists[0].accountType,
      payment_status: sanitizeInput(payment_status) || userExists[0].payment_status,
      notes: sanitizeInput(notes),
      institute,
      stop,
      profilePicture: req.file ? req.file.path : userExists[0].profilePicture,
    };
    
    if (!hashedPassword) {
      delete replacements.password;
    }
    
    // Update query
    await sequelize.query(
      `UPDATE tbl_sm360_users SET
        username = :username,
        email = :email,
        ${hashedPassword ? "password = :password," : ""}
        profilePicture = :profilePicture,
        phone = :phone,
        registrationNumber = :registrationNumber,
        gender = :gender,
        address = :address,
        emergency_contact_info = :emergency_contact_info,
        dateOfBirth = :dateOfBirth,
        nationality = :nationality,
        status = :status,
        verified = :verified,
        accountType = :accountType,
        payment_status = :payment_status,
        notes = :notes,
        instituteId = :institute,
        stopId = :stop,
        updatedAt = NOW()
      WHERE id = :id`,
      { replacements, type: sequelize.QueryTypes.UPDATE }
    );
    
    // Fetch the updated user to return in response
    const updatedUser = await sequelize.query(
      "SELECT * FROM tbl_sm360_users WHERE id = :id",
      { replacements: { id }, type: sequelize.QueryTypes.SELECT }
    );

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        ...updatedUser[0],
        password: undefined,
        instituteName: instituteRecord[0]?.name || "N/A",
        stopName: stopRecord[0]?.stopName || "N/A",
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    next(errorHandler(500, error.message || "Internal Server Error"));
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    const isAdmin = Number(user.isAdmin);
    const instituteId = Number(user.instituteId);

    // Check if user exists
    const userToDelete = await sequelize.query(
      'SELECT * FROM tbl_sm360_users WHERE id = :id',
      { replacements: { id }, type: sequelize.QueryTypes.SELECT }
    );

    // Restrict deletion to users within the admin's institute
    if (isAdmin == 2 && userToDelete[0].instituteId !== instituteId) {
      return next(errorHandler(403, 'You are not authorized to delete this user.'));
    }

    // Proceed to delete user
    const deletedUser = await User.destroy({ where: { id } });
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ message: "User deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// export const searchUser = async (req, res, next) => {
//   try {
//     const { term } = req.query;
//     const users = await User.find({
//       $or: [
//         { userName: { $regex: term, $options: 'i' } },
//         { email: { $regex: term, $options: 'i' } },
//       ]
//     });
//     res.status(200).json(users);
//   } catch (error) {
//     res.status(500).json({ message: 'Error searching users', error });
//   }
// };