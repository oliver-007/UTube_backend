import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  getCommentTotalLike,
  getUsersAllLikedVideos,
  getVideoTotalLike,
  toggleCommentLike,
  toggleVideoLike,
} from "../controllers/like.controller.js";

const router = Router();

router.route("/video/getlike").get(getVideoTotalLike);
router.route("/comment/getlike").get(getCommentTotalLike);

router.use(verifyJwt); // USER AUTHENTICATION WILL APPLY FOR ALL the following ROUTES below .

// +++++++++ ADD + GET COUNT LIKE ROUTE +++++++++
router.route("/video/toggle/:videoId").post(toggleVideoLike);
router.route("/comment/toggle/:commentId").post(toggleCommentLike);

// +++++++++ GET USER'S ALL LIKED VIDEOs ROUTE ++++++++++
router.route("/videos").get(getUsersAllLikedVideos);

export default router;
