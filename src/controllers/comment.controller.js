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
  const { vId, parentCommId } = req.query;
  const { content } = req.body;

  // console.log("vId from addComment contorller ********", vId);
  // console.log("parentCommId from addComment contorller ********", parentCommId);
  // console.log(typeof parentCommId);

  // console.log("content from addComment contorller ********", content);

  if (content.trim() === "") {
    throw new ApiError(400, "Comment shouldn't be empty !!!");
  }

  if (!vId) {
    throw new ApiError(400, "Video id required !!! ");
  }

  if (!isValidObjectId(vId)) {
    throw new ApiError(400, "Invalid video id !!!   ");
  }

  const videoExist = await Video.findById(vId);
  if (!videoExist) {
    throw new ApiError(400, "Video not found !!!");
  }

  let parentCommentExist = null;
  if (isValidObjectId(parentCommId)) {
    parentCommentExist = await Comment.findById(parentCommId);
  }
  // console.log("parentCommentExist ********* ", parentCommentExist);

  let newComment;
  if (parentCommentExist) {
    newComment = await Comment.create({
      content,
      video: vId,
      owner: currentUserId,
      parentComment: parentCommId,
    });
  } else {
    newComment = await Comment.create({
      content,
      video: vId,
      owner: currentUserId,
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        newComment,
        ` ${parentCommentExist ? "You Replied successfully. " : "You Commented Successfully."}`
      )
    );
});

// ++++++++ UPDATE COMMENT +++++++
const updateComment = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;

  const { content } = req.body;
  if (content.trim() === "") {
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

// ++++++++ GET COMMENTS OF ANY VIDEO +++++++++
const getCommentsOfAnyVideo = asyncHandler(async (req, res) => {
  const { vId, page, limit } = req.query; // here 'limit' porps is inActive, but keep this props for future modification, which'll come from frontend.

  if (!vId) {
    throw new ApiError(400, "Video Id is required !!!");
  }

  if (!isValidObjectId(vId)) {
    throw new ApiError(400, "Invalid Video Id !!!");
  }

  const videoExist = await Video.findById(vId);
  if (!videoExist) {
    throw new ApiError(400, "Video not found !!!");
  }

  // PAGINATION
  // TOTAL COMMENTS COUNT
  const totalComments = await Comment.countDocuments({ video: vId });
  const { totalPages, skip, parsedLimitForPerPage } = await pagination(
    page,
    limit,
    totalComments
  );

  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(vId),
        parentComment: null, // Only fetch top-level comments
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
        owner: { $first: "$owner" },
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "parentComment", // Lookup replies where parentComment matches the comment's _id
        as: "replies",
        pipeline: [
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
              owner: { $first: "$owner" },
            },
          },
          // Fetch nested replies (replies to replies)
          {
            $lookup: {
              from: "comments",
              localField: "_id",
              foreignField: "parentComment",
              as: "nestedReplies",
              pipeline: [
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
                    owner: { $first: "$owner" },
                  },
                },
              ],
            },
          },
          // Add the number of replies + nestedReplies
          {
            $addFields: {
              replyCount: {
                $add: [{ $size: "$nestedReplies" }, 1], // Add 1 for the reply itself and its nested replies
              },
            },
          },
        ],
      },
    },

    // Combine the total number of first-level replies and their nested replies
    {
      $addFields: {
        replyCount: {
          $reduce: {
            input: "$replies.replyCount", // Array of reply counts (from replies)
            initialValue: { count: 0 },
            in: { count: { $add: ["$$value.count", "$$this"] } }, // Sum of all reply counts
          },
        },
      },
    },
    {
      $skip: skip, // Pagination
    },
    {
      $limit: parsedLimitForPerPage, // Limit per page for pagination
    },
  ]);

  // console.log("comments *********", comments);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { comments, totalComments, totalPages },
        "Comments of this video fetched successfully "
      )
    );
});

export { addComment, updateComment, deleteComment, getCommentsOfAnyVideo };
