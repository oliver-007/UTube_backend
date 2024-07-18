import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  getChannelSubscriberCount,
  getSubscribedChannelListByUser,
  toggelSubscription,
} from "../controllers/subscription.controller.js";

const router = Router();

router.use(verifyJwt); // USER AUTHENTICATION WILL APPLY FOR ALL ROUTES.

// GET CHANNEL SUBSCRIBERS COUNT & TOGGLE SUBSCRIPTION ROUTE
router
  .route("/c/:channelId")
  .get(getChannelSubscriberCount)
  .post(toggelSubscription);

// GET SUBSCRIBED CHANNELS BY CURRENT LOGGED-IN USER ROUTE
router.route("/u/:userId").get(getSubscribedChannelListByUser);

export default router;
