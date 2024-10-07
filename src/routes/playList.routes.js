import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getAnyUsersAllPlaylist,
  getPlaylistById,
  removeVideoFromPlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller.js";
const router = Router();

// +++++++++ GET ANY PLAYLIST BY PLAYLIST-ID & CHANNEL-ID +++++++++
router.route(`/pl`).get(getPlaylistById);

// +++++++++ GET ANY USER'S ALL PLAYLIST ROUTE ++++++++++
router.route("/u").get(getAnyUsersAllPlaylist);

router.use(verifyJwt); // USER AUTHENTICATION WILL APPLY FOR ALL THE FOLLOWING  ROUTES BELLOW.

// +++++ CREATE PLAYLIST ROUTE +++++
router.route("/").post(createPlaylist).delete(deletePlaylist);

// ++++++ UPDATE PLAYLIST NAME ROUTE +++++++
router.route("/update").patch(updatePlaylist);

// +++++ ADD VIDEO TO PLAYLIST ROUTE ++++++
router.route("/add").patch(addVideoToPlaylist);

// +++++++ REMOVE VIDEO FROM PLAYLIST ROUTE ++++++
router.route("/remove").patch(removeVideoFromPlaylist);

export default router;
