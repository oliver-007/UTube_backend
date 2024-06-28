import { Router } from "express";
import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

// +++ REGISTER ROUTE ++++
router.route("/register").post(
  // ++++ MULTER MIDDLEWARE INJECTION ++++
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),

  //   ++++ CONTROLLER ++++
  registerUser
);

// ++++++ LOGIN ROUTE +++++
router.route("/login").post(loginUser);

// +++++ LOGOUT ROUTE ++++++
router.route("/logout").post(verifyJwt, logoutUser);

// +++++++ REFRESH ACCESS TOKEN ROUTE ++++++++
router.route("/refresh-token").post(refreshAccessToken);

export default router;
