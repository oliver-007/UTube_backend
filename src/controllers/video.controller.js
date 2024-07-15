import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

// +++++++ VIDEO UPLOAD +++++++
const videoUpload = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  // CURRENT USER DETAILS
  const currentUser = req.user;
  console.log("currentUser --- ", currentUser);

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
  //   "videoFileCloudinaryResponse duration- ---- ",
  //   videoFileCloudinaryResponse?.duration
  // );
  // console.log(
  //   "thumbnail_CloudinaryUrl -----",
  //   thumbnailCloudinaryResponse?.url
  // );

  // +++++++++ VIDEO FILE & THUMBNAIL & DETAILS UPLOAD ON DATABASE ++++++++++
  const video = await Video.create({
    videoFile: videoFileCloudinaryResponse?.url,
    thumbnail: thumbnailCloudinaryResponse?.url,
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

// +++++++++++ GET ALL VIDEOS +++++++++
const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  console.log("page==", page);
  console.log("limit ==", limit);
  console.log("search query  ==", query);

  // AGGREGATION PIPELINE ON VIDEO MODEL INSTEAD OF POPULATE()
  const allVideos = await Video.aggregate([
    {
      $match: {}, // Empty match stage fetches all documents
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
  ]);

  console.log("allVideos =-=-=-=-", allVideos);

  if (!allVideos.length > 0) {
    throw new ApiError(400, "No video found !!!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, allVideos, "All videos fetched Successfully"));
});

// ++++++++ GET VIDEO BY ID ++++++++
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

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

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched by id successfully."));
});

// ++++++++ UPDATE VIDEO DETAILS +++++++
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  const videoDetailsBeforeUpdate = await Video.findById(videoId);
  // console.log("videoDetailsBeforeUpdate ---- ", videoDetailsBeforeUpdate);

  const previousVideoThumbnailUrl = videoDetailsBeforeUpdate?.thumbnail;
  // console.log("previousVideoThumbnailUrl ----", previousVideoThumbnailUrl);

  if (!previousVideoThumbnailUrl) {
    throw new ApiError(400, "Previous video thumbnail url not found !");
  }

  // EXTRACT PUBLIC ID FROM THUMBNAIL URL
  const previousThumbnailPublicId = previousVideoThumbnailUrl
    .split("/")
    .slice(-2)
    .join("/")
    .split(".")[0];
  // console.log("splited -=-=-=-=- ", publicIdExtractedFromPreviousUrl);

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
  await deleteImageFileFromCloudinary(previousThumbnailPublicId);

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

  const videoDetailsFromDatabase = await Video.findById(videoId);
  console.log("videoDetailsFromDatabase =-=-=- ", videoDetailsFromDatabase);

  if (!videoDetailsFromDatabase) {
    throw new ApiError(400, "Video not found !");
  }

  const videoFileUrl = videoDetailsFromDatabase.videoFile;
  const videoThumbnailUrl = videoDetailsFromDatabase.thumbnail;

  // EXTRACT PUBLIC-ID FROM URL
  const videoFilePublicId = videoFileUrl
    .split("/")
    .slice(-2)
    .join("/")
    .split(".")[0];
  const videoThumbnailPublicId = videoThumbnailUrl
    .split("/")
    .slice(-2)
    .join("/")
    .split(".")[0];

  // DELETE VIDEO FROM DATABASE
  const deletedVideoResponse = await Video.findByIdAndDelete(videoId);
  console.log("deletedVideoResponse -- ", deletedVideoResponse);

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
  const { videoId } = req.params;

  const videoDetails = await Video.findById(videoId);
  // console.log("videoDetails =-=-=-=-", videoDetails);

  if (!videoDetails) {
    throw new ApiError(400, "Video not found !");
  }

  const publishStatusToggled = !videoDetails.isPublished;

  // console.log("publishStatusToggled =-=-=-=- ", publishStatusToggled);

  const updatedVideoPublishStatus = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: publishStatusToggled,
      },
    },
    { new: true }
  );

  // console.log(
  //   "video publish status update response --0-0======-",
  //   updatedVideoPublishStatus.isPublished
  // );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideoPublishStatus.isPublished,
        updatedVideoPublishStatus.isPublished
          ? "Video Published "
          : "Video Unpublished"
      )
    );
});

export {
  videoUpload,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
