import express from "express";
import { loginUser, loginDriver, signupUser, signupDriver, getUserDetails, getDriverDetails, updateReachDateTime, notifyIfSpeedExceeded, markMissedStop, markFinalStopReached, getReachTimesForRoute } from "../controllers/api.controller.js";
import { generateAdBanner } from "../controllers/advertisement.controller.js";
import { httpAuth } from "../middleware/wsAuth.middleware.js";
import { checkBusReplacement } from "../controllers/bus.controller.js";
import { getNotifications, getBusNotifications } from "../controllers/notification.controller.js";
import { oneTimeLogin } from "../controllers/auth.controller.js";

const apiRouter = express.Router();

apiRouter.post("/login/user",  loginUser);
apiRouter.post("/login/driver", loginDriver);
apiRouter.post("/signup/driver", signupUser);
apiRouter.post("/signup/user", signupDriver);
apiRouter.get("/user/details/:id", httpAuth, getUserDetails);
apiRouter.get("/driver/details/:id", httpAuth, getDriverDetails);
apiRouter.post("/stoppage/reached", httpAuth, updateReachDateTime); 
apiRouter.post("/notify/speed", httpAuth, notifyIfSpeedExceeded);
apiRouter.get("/advertisement/banner", generateAdBanner);
apiRouter.get("/bus/replacement/:busId", httpAuth, checkBusReplacement);
apiRouter.post("/missed-stoppage", httpAuth, markMissedStop);
apiRouter.post("/mark-final-stop",httpAuth, markFinalStopReached);
apiRouter.get("/reach-times/:route", httpAuth, getReachTimesForRoute);
apiRouter.get("/notifications", httpAuth, getNotifications);
apiRouter.get("/bus-notifications", httpAuth, getBusNotifications);
apiRouter.post('/one-time-login', oneTimeLogin);

export default apiRouter;
