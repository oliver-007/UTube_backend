import { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.model.js";

// ++++++++ TOGGLE VIDEO LIKE +++++++++
const toggleVideoLike = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;

  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id !!!");
  }

  const videoExist = await Video.findById(videoId);
  if (!videoExist) {
    throw new ApiError(400, "Video not found !!!");
  }

  const isVideoLiked = await Like.findOne({
    likedBy: currentUserId,
    video: videoId,
  });

  // TOGGLE VIDEO LIKE
  let videoLikeStatus;
  try {
    if (!isVideoLiked) {
      await Like.create({
        video: videoId,
        likedBy: currentUserId,
      });

      videoLikeStatus = { isVideoLiked: true };
    } else {
      await Like.findByIdAndDelete(isVideoLiked?._id);
      videoLikeStatus = { isVideoLiked: false };
    }
  } catch (error) {
    throw new ApiError(400, "Error while toggle video like / dislike", error);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        videoLikeStatus,
        "Video liked / disliked successfully ."
      )
    );
});

// +++++++ TOGGLE COMMENT LIKE ++++++++
const toggleCommentLike = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;

  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment Id !!!");
  }

  const commentExist = await Comment.findById(commentId);
  if (!commentExist) {
    throw new ApiError(400, "Comment not found !!!");
  }

  const isCommentLiked = await Like.findOne({
    likedBy: currentUserId,
    comment: commentId,
  });

  // TOGGLE COMMENT LIKE
  let commentLikeStatus;
  try {
    if (!isCommentLiked) {
      await Like.create({
        likedBy: currentUserId,
        comment: commentId,
      });

      commentLikeStatus = { isCommentLiked: true };
    } else {
      await Like.findByIdAndDelete(isCommentLiked?._id);
      commentLikeStatus = { isCommentLiked: false };
    }
  } catch (error) {
    throw new ApiError(400, "Error while comment toggle like / dislike", error);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        commentLikeStatus,
        "Comment liked / disliked successfully ."
      )
    );
});
export { toggleVideoLike, toggleCommentLike };
