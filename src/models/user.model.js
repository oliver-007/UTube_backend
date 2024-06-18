import { Schema, model } from "mongoose";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "email is required"],
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: [true, "full name is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // cloudinary url
      required: [true, "avatar is required"],
    },
    coverImage: {
      type: String, // cloudinary url
    },
    watchHistory: [{ type: Schema.Types.ObjectId, ref: "Video" }],
    password: { String, required: [true, "Password is Required"] },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// ++++++ PASSWORD ENCRIPTION +++++
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = bcryptjs.hash(this.password, 10);
    next();
  } else {
    return next();
  }
});

// +++++ PASSWORD CHECKING +++++++
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcryptjs.compare(password, this.password);
};

// ACCESS TOKEN GENERATION
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

// REFRESH TOKEN GENERATION
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = model("User", userSchema);
