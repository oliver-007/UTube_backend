import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  addComment,
  deleteComment,
  getCommentsOfAnyVideo,
  updateComment,
} from "../controllers/comment.controller.js";

const router = Router();

// ++++++++ GET TOP-LEVEL COMMENTS OF ANY VIDEO ROUTE ++++++++++
router.route("/").get(getCommentsOfAnyVideo);

router.use(verifyJwt); // apply "verifyJwt" middleware to all routes in this file

// ++++++++++ ADD COMMENT ON VIDEO / PARENT-COMMENT ROUTE +++++++++
router.route("/add").post(addComment);

// ++++++++ DELETE + UPDATE COMMENT ++++++++
router.route("/:commentId").delete(deleteComment).patch(updateComment);

export default router;
