import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  addComment,
  deleteComment,
  getAllCommentsOfAnyVideo,
  updateComment,
} from "../controllers/comment.controller.js";

const router = Router();

router.use(verifyJwt); // apply "verifyJwt" middleware to all routes in this file

// ++++++++++ ADD COMMENT + GET ALL COMMENTS ON VIDEO ROUTE +++++++++
router.route("/:videoId").post(addComment).get(getAllCommentsOfAnyVideo);

// ++++++++ DELETE COMMENT ++++++++
router.route("/:commentId").delete(deleteComment).patch(updateComment);

export default router;
