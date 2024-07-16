import { Schema, model } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String, // cloudinary url
      required: [true, "Video file is required !"],
    },
    video_public_id: {
      // FROM CLOUDINARY
      type: String,
      required: true,
    },
    thumbnail: {
      type: String, // cloudinary url
      required: [true, "Thumbnail is required !"],
    },
    thumbnail_public_id: {
      // FROM CLOUDINARY
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is requred !"],
    },
    description: {
      type: String,
      required: [true, "Description is required ! "],
    },
    duration: {
      // FROM CLOUDINARY
      type: Number,
      required: true,
    },

    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = model("Video", videoSchema);
