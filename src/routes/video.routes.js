import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  togglePublishStatus,
  updateVideo,
  videoUpload,
} from "../controllers/video.controller.js";

const router = Router();

router.use(verifyJwt); // Apply verifyJwt middleware to all routes in this file

// ++++++++ VIDEO UPLOAD || GET ALL VIDEO ROUTE +++++++++
router
  .route("/")
  .get(getAllVideos)
  .post(
    // MULTER MIDDLEWARE INJECTION
    upload.fields([
      {
        name: "videoFile",
        maxCount: 1,
      },
      {
        name: "thumbnail",
        maxCount: 1,
      },
    ]),
    videoUpload
  );

// +++++++ SINGLE VIDEO CRUD OPARATION ROUTE +++++++
router
  .route("/:videoId")
  .get(getVideoById)
  .patch(
    // MULTER MIDDLEWARE INJECTION
    upload.single("thumbnail"),
    updateVideo
  )
  .delete(deleteVideo);

// ++++++++ VIDEO PUBLISH TOGGLE ROUTE ++++++++
router.route("/publish/toggle/:videoId").patch(togglePublishStatus);

export default router;
