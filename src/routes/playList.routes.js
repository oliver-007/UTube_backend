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

router.use(verifyJwt); // USER AUTHENTICATION WILL APPLY FOR ALL THE FOLLOWING  ROUTES BELLOW.

// +++++ CREATE PLAYLIST ROUTE +++++
router.route("/").post(createPlaylist);

// ++++++ UPDATE PLAYLIST NAME & DETAILS + DELETE PLAYLIST ROUTE +++++++
router
  .route("/update/:playlistId")
  .patch(updatePlaylist)
  .delete(deletePlaylist);

// +++++ ADD VIDEO TO PLAYLIST ROUTE ++++++
router.route("/add").patch(addVideoToPlaylist);

// +++++++ REMOVE VIDEO FROM PLAYLIST ROUTE ++++++
router.route("/remove").patch(removeVideoFromPlaylist);

// +++++++++ GET ANY USER'S ALL PLAYLIST ROUTE ++++++++++
router.route("/u").get(getAnyUsersAllPlaylist);

export default router;
