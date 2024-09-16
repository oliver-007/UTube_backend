import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  getChannelSubscriberCount,
  getSubscribedChannelListByUser,
  toggleSubscription,
} from "../controllers/subscription.controller.js";

const router = Router();

// +++++++++ GET SUBSCRIPTION COUNT WITHOUT SIGN-IN ROUTE +++++++++
router.route("/ch/getsubscription").get(getChannelSubscriberCount);

router.use(verifyJwt); // USER AUTHENTICATION WILL APPLY FOR ALL the following ROUTES below .

// GET CHANNEL SUBSCRIBERS COUNT & TOGGLE SUBSCRIPTION ROUTE
router.route("/ch/toggle/:chId").post(toggleSubscription);

// GET SUBSCRIBED CHANNELS BY CURRENT LOGGED-IN USER ROUTE
router.route("/u/subscribed").get(getSubscribedChannelListByUser);

export default router;
