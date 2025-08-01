import express from 'express';
import {
  updateUser,
  uploadAdminImage
} from '../controllers/profile.controller.js';
import { verifyToken } from '../utils/verifyUser.js';

const router = express.Router();

router.put('/update/:id', uploadAdminImage.single("profile_picture"), verifyToken, updateUser);

export default router;
