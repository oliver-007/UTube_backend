import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Comment } from "../models/comment.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { pagination } from "../utils/pagination.js";

// +++++++ ADD COMMENT ++++++
const addComment = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;

  const { content } = req.body;
  if (content.trim() === "") {
    throw new ApiError(400, "Comment shouldn't be empty !!!");
  }

  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video id required !!! ");
  }

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

// ++++++++ UPDATE COMMENT +++++++
const updateComment = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;

  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Comment shouldn't be empty !!!");
  }

  const { commentId } = req.params;
  if (!commentId) {
    throw new ApiError(400, "Comment Id required !!!");
  }
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment Id !!!");
  }

  const commentExist = await Comment.findById(commentId);
  if (!commentExist) {
    throw new ApiError(400, "Comment not found !!!");
  }

  if (!commentExist?.owner.equals(currentUserId)) {
    throw new ApiError(
      400,
      "Unauthorized ! You are not allowed to edit this comment !!!"
    );
  } else {
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      {
        content,
      },
      {
        new: true,
      }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedComment, "Comment updated Successfully .")
      );
  }
});

// ++++++++ DELETE COMMENT +++++++
const deleteComment = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;
  const { commentId } = req.params;

  if (!commentId) {
    throw new ApiError(400, "Comment id required !!!");
  }

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid Comment Id !!!");
  }

  const commentExist = await Comment.findById(commentId);
  if (!commentExist) {
    throw new ApiError(400, "Comment not found !!! ");
  }

  // DELETE COMMENT BY VERIFIYING OWNER
  if (!commentExist?.owner.equals(currentUserId)) {
    // While comparing 2 different objectIds in mongoose, must use "equals()" method. Direct comparison using == or === won't work as expected because ObjectIds are complex objects.
    throw new ApiError(
      400,
      "Unauthorized ! You are not allowed to delete this comment !!!"
    );
  } else {
    const deletedComment = await Comment.findByIdAndDelete(commentId);

    return res.status(200, deletedComment, "Comment deleted Successfully !!!");
  }
});

// ++++++++ GET ALL COMMENTS OF ANY VIDEO +++++++++
const getAllCommentsOfAnyVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video id required !!!");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video Id !!!");
  }

  const videoExist = await Video.findById(videoId);
  if (!videoExist) {
    throw new ApiError(400, "Video not found !!!");
  }

  // PAGINATION
  const { page, limit } = req.query;
  // TOTAL COMMENTS COUNT
  const totalComments = await Comment.countDocuments({ video: videoId });
  const { parsedLimitForPerPage, skip, totalPages } = await pagination(
    page,
    limit,
    totalComments
  );

  // console.log("parsedLimit =-=-=-= ", parsedLimitForPerPage);
  // console.log("skip =-=-=-= ", skip);
  // console.log("totalComments =-=-=-= ", totalComments);
  // console.log("totalPages =-=-=-= ", totalPages);

  const allCommentsAggregateWithPagination = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
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

  // console.log(
  //   "allCommentsAggregateWithPagination =-=-=-  ",
  //   allCommentsAggregateWithPagination
  // );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { allCommentsAggregateWithPagination, totalComments, totalPages },
        "Fetched all comments of this video Successfully"
      )
    );
});

export { addComment, updateComment, deleteComment, getAllCommentsOfAnyVideo };
