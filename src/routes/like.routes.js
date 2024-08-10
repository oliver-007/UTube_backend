import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  toggleCommentLike,
  toggleVideoLike,
} from "../controllers/like.controller.js";

const router = Router();

router.use(verifyJwt); // USER AUTHENTICATION WILL APPLY FOR ALL ROUTES.

// +++++++++ ADD LIKE ROUTE +++++++++
router.route("/video/:videoId").post(toggleVideoLike);
router.route("/comment/:commentId").post(toggleCommentLike);

export default router;
