import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  getAllVideos,
  getVideoById,
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
router.route("/:videoId").get(getVideoById);

export default router;
