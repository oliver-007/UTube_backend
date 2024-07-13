import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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
  // todo >>>>>>>>>>>>>>
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
export { videoUpload, getAllVideos, getVideoById };
