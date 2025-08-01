import express from "express";
import {
  signup,
  signin,
  refreshAccessToken,
  google,
  getDetails,
  getInstituteById,
  getRoutesByInstitute,
  getAllRoutes,
  addUpdateDriverRoute,
  joinUs,
  getEnquiries,
  studentSelfRegister,
  oneTimeLogin
} from "../controllers/auth.controller.js";
import {
  getInstitutes,
  addInstitute,
  updateInstitute,
  deleteInstitute,
  uploadLogoImage
} from "../controllers/institute.controller.js";
import {
  getAdmins,
  addAdmins,
  updateAdmin,
  deleteAdmin,
  searchAdmins,
  addPendingStudent,
  checkUsername,
} from "../controllers/admin.controller.js";
import {
  getAllStoppages,
  addStop,
  updateStop,
  deleteStop,
} from "../controllers/stoppage.controller.js";
import {
  getDrivers,
  addDriver,
  updateDriver,
  deleteDriver,
  uploadDriverImage
} from "../controllers/driver.controller.js";
import {
  addRoute,
  updateRoute,
  deleteRoute,
} from "../controllers/route.controller.js";
import {
  getBuses,
  addBus,
  updateBus,
  deleteBus,
  getReplaceBuses,
  addReplaceBus,
  updateReplaceBus,
  deleteReplaceBus
} from "../controllers/bus.controller.js";
import {
  getAllUsers,
  addUser,
  updateUser,
  deleteUser,
  uploadUserImage
} from "../controllers/user.controller.js";
import {
  getAllAdvertisements,
  addAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  upload
} from "../controllers/advertisement.controller.js";
import { verifyToken } from "../utils/verifyUser.js";
import { getNotifications, createNotification, deleteNotification, getBusNotifications, createBusNotification, deleteBusNotification } from "../controllers/notification.controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.post('/refresh', refreshAccessToken);
router.post("/google", google);
router.get("/get-details", verifyToken, getDetails);
router.post("/join-us", joinUs);
router.get("/enquiries", verifyToken, getEnquiries);
router.post('/one-time-login', oneTimeLogin);
router.get('/check-username', checkUsername); // ✅ new route


router.get("/admins", getAdmins);
router.post("/admins", addAdmins);
router.put("/admins/:id", updateAdmin);
router.delete("/admins/:id", deleteAdmin);
router.get("/search", verifyToken, searchAdmins); 
router.post('/pending-student', verifyToken, addPendingStudent);


router.post("/institutes", verifyToken, uploadLogoImage.single("logo"), addInstitute);
router.put("/institutes/:id", verifyToken, uploadLogoImage.single("logo"), updateInstitute);
router.get("/institutes", verifyToken, getInstitutes);
router.get("/institutes/:id", getInstituteById);

router.get("/routes", verifyToken, getAllRoutes);
router.post("/routes", verifyToken, addRoute);
router.get("/routes/institute/:instituteId?", getRoutesByInstitute);
router.put("/routes/:id", verifyToken, updateRoute);
router.delete("/routes/:id", verifyToken, deleteRoute);
// router.get('/institutes/:instituteId/routes', getRoutesByInstitute);

router.delete("/institutes/:id", deleteInstitute);
router.get("/drivers", verifyToken, getDrivers);
router.post("/drivers", verifyToken, uploadDriverImage.single("profilePicture"), addDriver);
router.put("/drivers/:id", verifyToken, uploadDriverImage.single("profilePicture"), updateDriver);
router.delete("/drivers/:id", verifyToken, deleteDriver);
router.post("/drivers/routes", addUpdateDriverRoute);

// Buses
router.post("/buses", verifyToken, addBus);
router.put("/buses/:id", verifyToken, updateBus);
router.delete("/buses/:id", verifyToken, deleteBus);
router.get("/buses", verifyToken, getBuses);
router.get('/replaced_buses', verifyToken, getReplaceBuses);
router.post('/replaced_buses', verifyToken, addReplaceBus);
router.put('/replaced_buses/:id', verifyToken, updateReplaceBus);
router.delete('/replaced_buses/:id', verifyToken, deleteReplaceBus);

// Stops
router.get("/stoppages", verifyToken, getAllStoppages);
router.post("/stoppages", verifyToken, addStop);
router.put("/stoppages/:id", verifyToken, updateStop);
router.delete("/stoppages/:id", verifyToken, deleteStop);
// router.get('/stoppages', getStopsByRoute);

// Users
router.get("/users", verifyToken, getAllUsers);
router.post("/users", verifyToken, uploadUserImage.single("profilePicture"), addUser);
router.put("/users/:id", verifyToken, uploadUserImage.single("profilePicture"), updateUser);
router.delete("/users/:id", verifyToken, deleteUser);
router.post('/self-register', studentSelfRegister);

//Advertisement
router.get("/ads", getAllAdvertisements);
router.post("/ads", upload.single("image"), addAdvertisement);
router.put("/ads/:id", upload.single("image"), updateAdvertisement);
router.delete("/ads/:id", deleteAdvertisement);

//Notifications
router.post("/notifications/create", verifyToken, createNotification);
router.get("/notifications", verifyToken, getNotifications);
router.delete("/notifications/:id", verifyToken, deleteNotification);

//Bus Specific Notifications
router.post("/bus-notifications/create", verifyToken, createBusNotification);
router.get("/bus-notifications", verifyToken, getBusNotifications);
router.delete("/bus-notifications/:id", verifyToken, deleteBusNotification);

// router.get('/users/search', searchUser);

export default router;
