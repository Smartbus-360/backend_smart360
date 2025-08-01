import jwt from "jsonwebtoken";
import crypto from "crypto"; // Import for hashing
import { errorHandler } from "./error.js";
import sequelize from "../config/database.js";

export const verifyToken = async (req, res, next) => {
  let token = req.cookies.token || req.headers.authorization;

  if (token && token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  }

  if (!token) {
    return next(errorHandler(401, "Unauthorized: No token provided"));
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      console.log("Access token expired or invalid. Checking refresh token...");

      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        return next(errorHandler(401, "Unauthorized: Refresh token missing"));
      }

      // Hash the received refresh token
      const encryptedToken = crypto.createHmac("sha256", process.env.REFRESH_SECRET)
                                   .update(refreshToken)
                                   .digest("hex");

      // Check if the hashed refresh token exists in the database
      const [dbUser] = await sequelize.query(
        `SELECT id, isAdmin FROM tbl_sm360_users WHERE refreshToken = ?`,
        { replacements: [encryptedToken], type: sequelize.QueryTypes.SELECT }
      );

      if (!dbUser) {
        return next(errorHandler(403, "Forbidden: Invalid refresh token"));
      }

      // Generate a new access token
      const newAccessToken = jwt.sign(
        { id: dbUser.id, isAdmin: dbUser.isAdmin },
        process.env.JWT_SECRET,
        { expiresIn: "8h" }
      );

      console.log("New access token generated:", newAccessToken);

      // Attach the new token to the request object
      req.user = { id: dbUser.id, isAdmin: dbUser.isAdmin, newAccessToken };

      // Set new token in response headers (for frontend to capture)
      res.setHeader("Authorization", `Bearer ${newAccessToken}`);

      return next(); // Proceed to the next middleware (e.g., `getInstitutes`)
    }

    req.user = user;
    next();
  });
};
