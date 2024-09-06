import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { pagination } from "../utils/pagination.js";

// +++++++ VIDEO UPLOAD +++++++
const videoUpload = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  // CURRENT USER DETAILS
  const currentUser = req.user;
  // console.log("currentUser --- ", currentUser);

  if (!(title && description)) {
    throw new ApiError(400, "Title & Description are required !");
  }

  // console.log("Title -----", title);
  // console.log("description -----", description);

  // VIDEO FILE LOCAL PATH FROM MULTER
  let videoFileLocalPath;
  if (
    req.files &&
    req.files.videoFile &&
    Array.isArray(req.files.videoFile) &&
    req.files.videoFile[0].path
  ) {
    videoFileLocalPath = req.files.videoFile[0].path;
  }
  // console.log("Video_File local path ---", videoFileLocalPath);

  // THUMBNAIL LOCAL PATH FROM MULTER
  let thumbnailLocalPath;
  if (
    req.files &&
    req.files.thumbnail &&
    Array.isArray(req.files.thumbnail) &&
    req.files.thumbnail[0].path
  ) {
    thumbnailLocalPath = req.files.thumbnail[0].path;
  }
  // console.log("Thumbnail local path ---", thumbnailLocalPath);

  // FILE UPLOAD ON CLOUDINARY

  // VIDEO FILE CLOUDINARY URL
  const videoFileCloudinaryResponse =
    await uploadOnCloudinary(videoFileLocalPath);

  // THUMBNAIL CLOUDINARY URL
  const thumbnailCloudinaryResponse =
    await uploadOnCloudinary(thumbnailLocalPath);

  // console.log(
  //   "videoFile_CloudinaryUrl -----",
  //   videoFileCloudinaryResponse?.url
  // );
  // console.log(
  //   "videoFileCloudinaryResponse - ---- ",
  //   videoFileCloudinaryResponse
  // );
  // console.log(
  //   "thumbnailCloudinaryResponse =-=-=- ",
  //   thumbnailCloudinaryResponse
  // );
  // console.log(
  //   "thumbnail_CloudinaryUrl -----",
  //   thumbnailCloudinaryResponse?.url
  // );

  // +++++++++ VIDEO FILE & THUMBNAIL & DETAILS UPLOAD ON DATABASE ++++++++++
  const video = await Video.create({
    videoFile: videoFileCloudinaryResponse?.url,
    video_public_id: videoFileCloudinaryResponse?.public_id,
    thumbnail: thumbnailCloudinaryResponse?.url,
    thumbnail_public_id: thumbnailCloudinaryResponse?.public_id,
    title,
    description,
    duration: videoFileCloudinaryResponse?.duration,
    owner: currentUser._id,
  });

  if (!video) {
    throw new ApiError(
      500,
      "Something went worng while uploading video file on database ! "
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, video, "Video uploaded on Databse Successfully. 👍 ")
    );
});

// +++++++++++ GET ALL VIDEOS OF ALL USERS +++++++++
const getAllVideos = asyncHandler(async (req, res) => {
  const { page, limit, query, sortBy, sortType, userId } = req.query;
  const totalVideos = await Video.countDocuments({ isPublished: true });
  const { parsedLimitForPerPage, skip, totalPages } = await pagination(
    page,
    limit,
    totalVideos
  );

  // AGGREGATION PIPELINE ON VIDEO MODEL INSTEAD OF POPULATE()
  const allVideosAggregateWithPagination = await Video.aggregate([
    {
      $match: {
        isPublished: true,
      },
      // Empty match stage fetches all documents
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
              username: 1,
              fullName: 1,
              avatar: 1,
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
      $skip: skip,
    },
    {
      $limit: parsedLimitForPerPage,
    },
  ]);

  // console.log("allVideos =-=-=-=-", allVideosAggregateWithPagination);

  if (!allVideosAggregateWithPagination.length > 0) {
    throw new ApiError(400, "No video found !!!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { allVideosAggregateWithPagination, totalPages, totalVideos },
        "All videos fetched Successfully"
      )
    );
});

// ++++++++++ GET ALL VIDEOS OF A SPECIFIC USER ++++++++
const getAllVideosOfAUser = asyncHandler(async (req, res) => {
  const { uId, page } = req.query;
  // console.log("uid -=-=-=- ", uId);
  // console.log("page -=-=-=- ", page);
  // console.log("limit -=-=-=- ", limit);

  if (!uId) {
    throw new ApiError(400, "User id required !!!");
  }

  if (!isValidObjectId(uId)) {
    throw new ApiError(400, "Invalid user id !!!");
  }

  // PAGINATION

  const totalVideos = await Video.countDocuments({
    owner: uId,
    isPublished: true,
  });
  const { parsedLimitForPerPage, skip, totalPages } = await pagination(
    page,
    totalVideos
  );

  const allVideosOfAUserAggregateWithPagination = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(uId),
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
              username: 1,
              fullName: 1,
              avatar: 1,
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
      $skip: skip,
    },
    {
      $limit: parsedLimitForPerPage,
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        allVideosOfAUserAggregateWithPagination,
        totalPages,
        totalVideos,
      },
      `${allVideosOfAUserAggregateWithPagination.length > 0 ? "Videos of this user fetched successfully ." : "No Video Found !!!"}`
    )
  );
});

// ++++++++ GET VIDEO BY VIDEO ID TO WATCH ++++++++
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const currentUser = req.user;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id.");
  }

  const isVideoExists = await Video.findById(videoId);

  if (!isVideoExists) {
    throw new ApiError(400, "Vidoe not found!  ");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
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
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
          // $arrayElemAt: ["$owner", 0],
        },
      },
    },
  ]);

  // INCREMENT VIEWS OF VIDEOS
  if (req.user) {
    if (!currentUser.watchHistory.includes(videoId)) {
      await Video.findByIdAndUpdate(
        videoId,
        {
          $inc: {
            views: 1,
          },
        },
        { new: true }
      );
    }

    // PUT VIDEO_ID IN USER'S WATCH_HISTORY ARRAY
    await User.findByIdAndUpdate(
      req.user?._id,
      {
        $addToSet: {
          watchHistory: videoId,
        },
      },
      {
        new: true,
      }
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched by id successfully."));
});

// ++++++++ UPDATE VIDEO DETAILS +++++++
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id !");
  }

  const videoDetailsBeforeUpdate = await Video.findById(videoId);
  // console.log("videoDetailsBeforeUpdate ---- ", videoDetailsBeforeUpdate);

  const previousVideoThumbnailPublicId =
    videoDetailsBeforeUpdate?.thumbnail_public_id;

  // console.log(
  //   "previousVideoThumbnailPublicId ----",
  //   previousVideoThumbnailPublicId
  // );

  if (!previousVideoThumbnailPublicId) {
    throw new ApiError(400, "Previous video thumbnail public_id not found !");
  }

  if (!(title && description)) {
    throw new ApiError(400, "Title & Description ara required ! ");
  }

  // UPDATED THUMBNAIL LOCAL FILE PATH
  const updatedThumbnailLocalPath = req.file?.path;
  // console.log("thumbnail----", req.file);

  if (!updatedThumbnailLocalPath) {
    throw new ApiError(400, " Updated Thumbnail Local file path not found !");
  }

  // UPLOAD ON CLUDINARY UPDATED THUMBNAIL
  const updatedThumbnailCloudinaryResponse = await uploadOnCloudinary(
    updatedThumbnailLocalPath
  );

  // console.log(
  //   "updatedThumbnailCloudinaryResponse ----",
  //   updatedThumbnailCloudinaryResponse
  // );

  if (!updatedThumbnailCloudinaryResponse.url) {
    throw new ApiError(
      400,
      " Updated-thumbnail upload on cloudinary FAILED ( url & public_id not found) !!! "
    );
  }

  const updatedThumbnailCloudinaryUrl = updatedThumbnailCloudinaryResponse?.url;

  // UPDATE METHOD APPLY
  const updatedVideoDetails = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: updatedThumbnailCloudinaryUrl,
      },
    },
    { new: true }
  );

  // DELETE PREVIOUS THUMBNAIL FORM CLOUDINARY CLOUD
  await deleteFromCloudinary(previousVideoThumbnailPublicId);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideoDetails,
        "Video details updated Successfully ."
      )
    );
});

// +++++++++ DELETE VIDEO +++++++++
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id !");
  }

  const videoDetailsFromDatabase = await Video.findById(videoId);
  // console.log("videoDetailsFromDatabase =-=-=- ", videoDetailsFromDatabase);

  if (!videoDetailsFromDatabase) {
    throw new ApiError(400, "Video not found !");
  }

  const videoFilePublicId = videoDetailsFromDatabase.video_public_id;
  const videoThumbnailPublicId = videoDetailsFromDatabase.thumbnail_public_id;

  // DELETE VIDEO FROM DATABASE
  const deletedVideoResponse = await Video.findByIdAndDelete(videoId);
  // console.log("deletedVideoResponse -- ", deletedVideoResponse);

  if (!deletedVideoResponse) {
    throw new ApiError(500, "Video Deletion from database FAILED ! ");
  }

  // DELETE VIDEO & THUMBNAIL FROM CLOUDINARY
  await deleteFromCloudinary(videoFilePublicId, "video");
  await deleteFromCloudinary(videoThumbnailPublicId, "image");

  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedVideoResponse, "Video deleted Successfully ")
    );
});

// ++++++++ VIDEO PUBLISH TOGGLE +++++++
const togglePublishStatus = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video Id !");
  }

  const videoExist = await Video.findById(videoId);

  if (!videoExist) {
    throw new ApiError(400, "Video not found !");
  }

  // VIDEO OWNER VERIFICATION
  let updatedVideoPublishStatus;
  if (!videoExist?.owner.equals(currentUserId)) {
    throw new ApiError(
      400,
      "You are not authorized to perform this action !!!"
    );
  } else {
    const publishStatusToggled = !videoExist.isPublished;

    updatedVideoPublishStatus = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          isPublished: publishStatusToggled,
        },
      },
      { new: true }
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideoPublishStatus.isPublished
          ? "Video Published "
          : "Video Unpublished"
      )
    );
});

export {
  videoUpload,
  getAllVideos,
  getAllVideosOfAUser,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
