import mongoose, { Schema, model } from "mongoose";

const likeSchema = new Schema(
  {
    likedBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    comment: {
      type: mongoose.Types.ObjectId,
      ref: "Comment",
    },
    video: {
      type: mongoose.Types.ObjectId,
      ref: "Video",
    },
  },
  {
    timestamps: true,
  }
);

export const Like = model("Like", likeSchema);
