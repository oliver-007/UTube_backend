import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { toggelSubscription } from "../controllers/subscription.controller.js";

const router = Router();

router.use(verifyJwt); // USER AUTHENTICATION WILL APPLY FOR ALL ROUTES.

router
  .route("/c/:channelId")
  // .get(getUserChannelSubscribers)
  .post(toggelSubscription);

// router.route("/u/:subscriberId").get(getSubscribedChannels);

export default router;
