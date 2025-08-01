import bcryptjs from 'bcryptjs';
import { errorHandler } from '../utils/error.js';
import User from '../models/user.model.js';
import sharp from 'sharp';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const baseURL = "https://api.smartbus360.com";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/profile_pictures';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// // Middleware for file uploads
// const upload = multer({ storage: storage }).single('profile_picture');
export const uploadAdminImage = multer({ storage: storage });
// // Function to resize image
// const resizeImage = async (filePath) => {
//   // Create a new path for the resized image
//   const outputFilePath = filePath.replace(/(.*)(\/|\\)([^/\\]*)$/, '$1$2resized-$3');
//   await sharp(filePath)
//     .resize({ width: 250, height: 250 }) 
//     .toFormat('jpeg')
//     .jpeg({ quality: 80 }) 
//     .toFile(outputFilePath);
  
//   // Return the new file path for the resized image
//   return outputFilePath;
// };

export const updateUser = async (req, res, next) => {

  const adminId = req.params.id;
  const {
    email,
    full_name,
    username,
    phone_number,
    password,
    profile_picture,
  } = req.body;

  const userId = req.user.id;
  if (isNaN(Number(userId))) {
    return next(errorHandler(400, 'Invalid user ID.'));
  }  
  const user = await User.findByPk(userId);
  if (!user) {
    return next(errorHandler(404, "Admin not found."));
  }
  const isAdmin = Number(user.isAdmin);
  
  // if (isAdmin === 1 || isAdmin === 2) {
  //   return next(errorHandler(403, 'You are not authorized to update this profile.'));
  // }
  
  if (isNaN(Number(adminId))) {
    return next(errorHandler(400, 'Invalid Admin ID.'));
  }

  try {
    if (password) {
      const isSamePassword = bcryptjs.compareSync(password, user.password);
      if (!isSamePassword) {
        user.password = bcryptjs.hashSync(password, 12);
      }
    }

    const profilePicturePath = req.file ? req.file.path : undefined;

    if (profilePicturePath) {
      user.profilePicture = profilePicturePath;
    }    

    user.full_name = full_name;
    user.username = username;
    user.phone = phone_number;
    user.email = email;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user.id,
        name: user.full_name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        profilePicture: user.profilePicture
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    next(error);
  }
};

// export const updateUser = async (req, res, next) => {

//   const id = req.params.userId;
//   const userId = req.user.id;

//   upload(req, res, async (err) => {
//     if (err) return next(errorHandler(400, 'Error uploading file'));

//     // Check if the user is the owner of the profile
//     if (Number(id) !== Number(userId)) {
//       return next(errorHandler(403, 'You are not allowed to update this user'));
//     }

//     const user = await User.findByPk(Number(id));

//     // Resize and save profile picture if exists
//     let profilePictureUrl;
//     if (req.file) {
//       const resizedImagePath = await resizeImage(req.file.path);
//       const baseName = path.basename(resizedImagePath);
//       const imageName = baseName.startsWith('resized-') ? baseName : `resized-${baseName}`;
      
//       // Construct the profile picture URL
//       profilePictureUrl = `https://api.smartbus360.com/uploads/profile_pictures/${imageName}`;
//     }

//     try {
//       if (password) {
//         const isSamePassword = bcryptjs.compareSync(req.body.password, user.password);
//         if (!isSamePassword) {
//           user.password = bcryptjs.hashSync(req.body.password, 12);
//         }
//       }

//       user.full_name = req.body.full_name;
//       user.phone = req.body.phone_number;
//       user.profilePicture = profilePictureUrl || req.body.profilePicture;
      
//       await user.save();

//       const updatedUser = await User.findByPk(Number(id));
//       const { password, ...rest } = updatedUser.dataValues;
//       res.status(200).json(rest);
//     } catch (error) {
//       if (error.name === 'SequelizeDatabaseError') {
//         console.error("Error saving user to database:", error);
//         return next(errorHandler(500, 'Database error occurred'));
//       } else {
//         console.error("Error updating user:", error);
//         return next(errorHandler(500, 'Could not update user'));
//       }
//     }
//   });
// };



export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
}

export const deleteUser = async (req, res, next) => {
  if (!req.user.isAdmin && req.user.id !== req.params.userId) {
    return next(errorHandler(403, 'You are not allowed to delete this user'));
  }
  try {
    await User.findByIdAndDelete(req.params.userId);
    res.status(200).json('User has been deleted');
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  if (!req.user.isAdmin) {
    return next(errorHandler(403, 'You are not allowed to see all users'));
  }
  try {
    const startIndex = parseInt(req.query.startIndex) || 0;
    const limit = parseInt(req.query.limit) || 9;
    const sortDirection = req.query.sort === 'asc' ? 1 : -1;

    const users = await User.find()
      .sort({ createdAt: sortDirection })
      .skip(startIndex)
      .limit(limit);

    const usersWithoutPassword = users.map((user) => {
      const { password, ...rest } = user._doc;
      return rest;
    });

    const totalUsers = await User.countDocuments();

    const now = new Date();

    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );
    const lastMonthUsers = await User.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });

    res.status(200).json({
      users: usersWithoutPassword,
      totalUsers,
      lastMonthUsers,
    });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return next(errorHandler(404, 'User not found'));
    }
    const { password, ...rest } = user._doc;
    res.status(200).json(rest);
  } catch (error) {
    next(error);
  }
};

// export const signout = (req, res, next) => {
//   try {
//     res
//       .clearCookie('token')
//       .status(200)
//       .json('User has been signed out');
//   } catch (error) {
//     next(error);
//   }
// };

