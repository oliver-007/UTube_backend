import { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Comment } from "../models/comment.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";

const addComment = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;

  const { content } = req.body;
  if (content.trim() === "") {
    throw new ApiError(400, "Comment shouldn't be empty !!!");
  }

  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id !!!   ");
  }

  const videoExist = await Video.findById(videoId);
  if (!videoExist) {
    throw new ApiError(400, "Video not found !!!");
  }

  const newComment = await Comment.create({
    content,
    video: videoId,
    owner: currentUserId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, newComment, "Comment added Successfully ."));
});

export { addComment };
