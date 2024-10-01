import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  addComment,
  deleteComment,
  getAllCommentsOfAnyVideo,
  updateComment,
} from "../controllers/comment.controller.js";

const router = Router();

// ++++++++ GET ALL COMMENTS OF ANY VIDEO ROUTE ++++++++++
router.route("/").get(getAllCommentsOfAnyVideo);

router.use(verifyJwt); // apply "verifyJwt" middleware to all routes in this file

// ++++++++++ ADD COMMENT ON VIDEO ROUTE +++++++++
router.route("/:videoId").post(addComment);

// ++++++++ DELETE + UPDATE COMMENT ++++++++
router.route("/:commentId").delete(deleteComment).patch(updateComment);

export default router;
