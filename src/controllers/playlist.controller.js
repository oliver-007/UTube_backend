import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

// +++++++++ CREATE PLAYLIST +++++++++
const createPlaylist = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;

  // USER ID VERIFICATION
  if (!currentUserId) {
    throw new ApiError(400, "User not found !!!");
  }

  const { name, description } = req.body;

  // EMPTY FIELD VERIFICATION
  if (
    [name, description].some((field) => {
      return field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "Name & Description shouldn't be empty !!!");
  }

  // PLAYLIST NAME ALREADY EXIST FOR SAME USER, VERIFICATION
  const playlistExist = await Playlist.aggregate([
    {
      $match: {
        // 1ST - find playlist owner
        // 2nd - check, whether playlist name already exist or not with same owner
        owner: new mongoose.Types.ObjectId(currentUserId),
        name,
      },
    },
  ]);

  //   console.log("playlistExist =-=-=-= ", playlistExist);

  if (playlistExist.length > 0) {
    throw new ApiError(400, "Playlist name already exist !!!");
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: currentUserId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created Successfully"));
});

// +++++++ ADD VIDEO TO PLAYLIST +++++++
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;

  if (!(isValidObjectId(videoId) || isValidObjectId(playlistId))) {
    throw new ApiError(400, "Invalid Video or playlist Id !!!");
  }

  if (!(videoId || playlistId)) {
    throw new ApiError(400, "Video id or Playlist Id required !!!");
  }

  // VIDOE AVAILABILITY VERIFICATION
  const videoExist = await Video.findById(videoId);

  if (!videoExist) {
    throw new ApiError(400, "Video not found !!!");
  }

  // PLAYLIST AVAILABLITY VERIFICATION
  const playlistExist = await Playlist.findById(playlistId);
  if (!playlistExist) {
    throw new ApiError(400, "Playlist not found !!!");
  }

  //   console.log("playlistExist =-=-=-  ", playlistExist);

  // UPDATE PLAYLIST
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: {
        videoList: videoId,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video added to playlist Successfully."
      )
    );
});

// ++++++ REMOVE VIDEO FROM PLAYLIST +++++++
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  // >>>>>>>>> To Do >>>>>>>>>>>>
});

// +++++++ GET USER'S ALL PLAYLIST ++++++++
const getUserAllPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid User Id !!!");
  }

  const allPlaylists = await Playlist.find({ owner: userId });
  console.log("allPlaylists -=-=-=- ", allPlaylists);
});

export { createPlaylist, addVideoToPlaylist, getUserAllPlaylists };
