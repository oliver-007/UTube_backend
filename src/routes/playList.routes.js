import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  addVideoToPlaylist,
  createPlaylist,
  getUserAllPlaylists,
} from "../controllers/playlist.controller.js";
const router = Router();

router.use(verifyJwt); // USER AUTHENTICATION WILL APPLY FOR ALL ROUTES.

// +++++ CREATE PLAYLIST ROUTE +++++
router.route("/").post(createPlaylist);

// +++++++++ GET ANY USER'S ALL PLAYLISTS ROUTE ++++++++++
router.route("/u/:userId").get(getUserAllPlaylists);

// +++++ ADD VIDEO TO PLAYLIST ROUTE ++++++
router.route("/add/:videoId/:playlistId").post(addVideoToPlaylist);

export default router;
