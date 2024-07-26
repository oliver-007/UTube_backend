import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  addVideoToPlaylist,
  createPlaylist,
  getUserAllPlaylists,
  removeVideoFromPlaylist,
} from "../controllers/playlist.controller.js";
const router = Router();

router.use(verifyJwt); // USER AUTHENTICATION WILL APPLY FOR ALL ROUTES.

// +++++ CREATE PLAYLIST ROUTE +++++
router.route("/").post(createPlaylist);

// +++++++++ GET ANY USER'S ALL PLAYLISTS ROUTE ++++++++++
router.route("/u/:userId").get(getUserAllPlaylists);

// +++++ ADD VIDEO TO PLAYLIST ROUTE ++++++
router.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist);

// +++++++ REMOVE VIDEO FROM PLAYLIST ROUTE ++++++
router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist);

export default router;
