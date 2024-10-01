import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

// +++++++++ CREATE PLAYLIST +++++++++
const createPlaylist = asyncHandler(async (req, res) => {
  const currentUId = req.user?._id;
  const { name } = req.body;
  const { vId } = req.query;

  // console.log("name from playlist controller -------------", name);
  // console.log("vId from playlist controller -------------", vId);

  if (!name) {
    throw new ApiError(400, "Name is required !!!");
  }

  // PLAYLIST NAME ALREADY EXIST FOR SAME USER, VERIFICATION
  const playlistExist = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(currentUId),
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
    owner: currentUId,
    videoList: [vId],
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, `Video added to '${name}' Successfully.`)
    );
});

// +++++++ UPDATE PLAYLIST NAME & DETAILS +++++++++
const updatePlaylist = asyncHandler(async (req, res) => {
  const currentUId = req.user?._id;

  const { name, description } = req.body;
  if (!(name || description)) {
    throw new ApiError(400, "Name & Description required !!!");
  }

  if ([name, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Name or Description shouldn't be empty !!!");
  }

  const { pLId } = req.params;
  if (!pLId) {
    throw new ApiError(400, "Playlist id required !!!");
  }

  if (!isValidObjectId(pLId)) {
    throw new ApiError(400, "Invalid playlist Id !!!");
  }

  const playlistExist = await Playlist.findById(pLId);

  if (!playlistExist) {
    throw new ApiError(400, "Playlist not found !!!");
  }

  // UPDATE NAME & DESCRIPTION VERIFIYING OWNER
  if (!playlistExist?.owner.equals(currentUId)) {
    // While comparing 2 different objectIds in mongoose, must use "equals()" method. Direct comparison using == or === won't work as expected because ObjectIds are complex objects.
    throw new ApiError(
      400,
      "Unauthorized , You are not authorized to edit this playlist !!!"
    );
  } else {
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      pLId,
      {
        $set: {
          name,
          description,
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
          "Playlist Name & Description updated Successfully ."
        )
      );
  }
});

// ++++++++ DELETE PLAYLIST +++++++
const deletePlaylist = asyncHandler(async (req, res) => {
  const currentUId = req.user?._id;
  const { pLId } = req.query;

  if (!pLId) {
    throw new ApiError(400, "Playlist id required !!!");
  }

  if (!isValidObjectId(pLId)) {
    throw new ApiError(400, "Invalid Playlist Id !!!");
  }

  // DELETE PLAYLIST BY VERIFIYING OWNER
  const playlistExist = await Playlist.findById(pLId);

  if (!playlistExist?.owner.equals(currentUId)) {
    // While comparing 2 different objectIds in mongoose, must use "equals()" method. Direct comparison using == or === won't work as expected because ObjectIds are complex objects.
    throw new ApiError(
      400,
      "Unauthorized !!! You are not allowed to delete this playlist !!!"
    );
  } else {
    const deletedPlaylist = await Playlist.findByIdAndDelete(pLId);

    return res
      .status(200)
      .json(
        new ApiResponse(200, deletedPlaylist, " Playlist deleted Successfully.")
      );
  }
});

// +++++++ ADD VIDEO TO PLAYLIST +++++++
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const currentUId = req.user?._id;
  const { vId, pLId } = req.query;

  if (!(isValidObjectId(vId) || isValidObjectId(pLId))) {
    throw new ApiError(400, "Invalid Video or playlist Id !!!");
  }

  if (!(vId || pLId)) {
    throw new ApiError(400, "Video id or Playlist Id required !!!");
  }

  // VIDOE AVAILABILITY VERIFICATION
  const videoExist = await Video.findById(vId);

  if (!videoExist) {
    throw new ApiError(400, "Video not found !!!");
  }

  // PLAYLIST AVAILABLITY VERIFICATION
  const playlistExist = await Playlist.findById(pLId);
  if (!playlistExist) {
    throw new ApiError(400, "Playlist not found !!!");
  }

  // UPDATE VIDEOLIST BY ADDING VIDEO BY VERIFIYING OWNER
  if (!playlistExist?.owner.equals(currentUId)) {
    // While comparing 2 different objectIds in mongoose, must use "equals()" method. Direct comparison using == or === won't work as expected because ObjectIds are complex objects.
    throw new ApiError(
      400,
      "Unauthorized , You are not authorized to edit this playlist !!!"
    );
  } else {
    // UPDATE VIDEOLIST FIELD OF PLAYLIST

    let updatedPlaylist;

    if (!playlistExist.videoList.includes(vId)) {
      updatedPlaylist = await Playlist.findByIdAndUpdate(
        pLId,

        // instead of using $addToSet operator, i used $push with $each & $positon operator so that new video can be added to the top of the array. And to avoid duplicat vId i used this condition first : "!playlistExist.videoList.includes(vId)"

        // {
        //   $addToSet: {
        //     videoList: vId,
        //   },
        // },
        {
          $push: {
            videoList: {
              $each: [vId],
              $position: 0, // Push to the 0th position
            },
          },
        },
        {
          new: true,
        }
      );
    } else {
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedPlaylist,
          `${playlistExist.videoList.includes(vId) ? `Already added to ${playlistExist.name}  playlist.` : `Video added to '${playlistExist.name}' playlist Successfully.`} `
        )
      );
  }
});

// ++++++ REMOVE VIDEO FROM PLAYLIST +++++++
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const currentUId = req.user?._id;
  const { vId, pLId } = req.query;

  if (!(isValidObjectId(vId) || isValidObjectId(pLId))) {
    throw new ApiError(400, "Invalid video or playlist id !!!");
  }

  if (!(vId || pLId)) {
    throw new ApiError(400, "Video id & Playlist Id required !!!");
  }

  const videoExist = await Video.findById(vId);

  if (!videoExist) {
    throw new ApiError(400, "Video not found !!!");
  }

  const playlistExist = await Playlist.findById(pLId);
  if (!playlistExist) {
    throw new ApiError(400, "Playlist not found !!!");
  }

  // UPDATE VIDEOLIST BY REMOVING VIDEO BY VERIFIYING OWNER
  if (!playlistExist?.owner.equals(currentUId)) {
    // While comparing 2 different objectIds in mongoose, must use "equals()" method. Direct comparison using == or === won't work as expected because ObjectIds are complex objects.
    throw new ApiError(
      400,
      "Unauthorized, Your are not authorized to edit playlist !!!"
    );
  } else {
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      pLId,
      {
        $pull: {
          videoList: vId,
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
          `Video removed from '${playlistExist.name}' playlist Successfully. `
        )
      );
  }
});

// +++++++ GET ANY USER'S ALL PLAYLIST ++++++++
const getAnyUsersAllPlaylist = asyncHandler(async (req, res) => {
  const { uId } = req.query;
  if (!uId) {
    throw new ApiError(400, "User id required !!!");
  }

  if (!isValidObjectId(uId)) {
    throw new ApiError(400, "Invalid User Id !!!");
  }

  const allPlaylist = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(uId),
      },
    },
    // FOR OWNER OF PLAYLIST
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
              coverImage: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    // FOR VIDEOS OF PLAYLIST
    {
      $lookup: {
        from: "videos",
        localField: "videoList",
        foreignField: "_id",
        as: "videoList",
        pipeline: [
          {
            $project: {
              video_public_id: 0,
              thumbnail_public_id: 0,
            },
          },
          // FOR OWNER OF VIDEOS
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                    coverImage: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        allPlaylist,
        "Fetched user's all playlists Successfully"
      )
    );
});

// +++++++++++++ GET SINGLE PLAYLIST BY ID +++++++++++++
const getPlaylistById = asyncHandler(async (req, res) => {
  const { pLId } = req.query;

  if (!pLId) {
    throw new ApiError(400, "Playlist Id is required !!!");
  }
  if (!isValidObjectId(pLId)) {
    throw new ApiError(400, "Invalid playlist Id !!!");
  }
  const playlistExist = await Playlist.findById(pLId);
  if (!playlistExist) {
    throw new ApiError(400, "Playlist not found !!!");
  }
  // ---- PLAYLIST AGGREGATION -----
  const selectedPlaylist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(pLId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              _id: 1,
              fullName: 1,
              username: 1,
              email: 1,
              avatar: 1,
              coverImage: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videoList",
        foreignField: "_id",
        as: "videoList",
        pipeline: [
          {
            $project: {
              thumbnail_public_id: 0,
              video_public_id: 0,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    fullName: 1,
                    username: 1,
                    email: 1,
                    avatar: 1,
                    coverImage: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        selectedPlaylist[0],
        "Playlist fetched by Id successfully ."
      )
    );
});

export {
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  getAnyUsersAllPlaylist,
  getPlaylistById,
};
