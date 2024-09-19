import { Schema, model } from "mongoose";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";

// Utility function to format the username
function formatUsername(username) {
  const formattedUsername = username
    .split(" ") // Split the string by spaces
    .filter((word) => word.trim() !== "") // Remove any extra spaces
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize the first letter of each word
    .join(""); // Join the words back without a space

  // Add '@' at the beginning if not already present
  return formattedUsername.startsWith("@")
    ? formattedUsername
    : `@${formattedUsername}`;
}

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "username is required"],
      unique: true,
      trim: true,
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
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // cloudinary url
      required: [true, "avatar is required"],
    },
    avatar_public_id: {
      // FROM CLOUDINARY
      type: String,
      required: true,
    },
    coverImage: {
      type: String, // cloudinary url
    },
    coverImage_public_id: {
      // FROM CLOUDINARY
      type: String,
    },
    watchHistory: [{ type: Schema.Types.ObjectId, ref: "Video" }],
    password: {
      type: String,
      required: [true, "Password is Required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// ++++++ PASSWORD ENCRIPTION BEFORE SAVE +++++
userSchema.pre("save", async function (next) {
  // Format the username before saving
  if (this.isModified("username")) {
    this.username = formatUsername(this.username);
  }

  // Hash the password if it was modified
  if (!this.isModified("password")) return next();
  this.password = await bcryptjs.hash(this.password, 10);
  next();
});

// +++++ PASSWORD CHECKING +++++++
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcryptjs.compare(password, this.password);
};

// ACCESS TOKEN GENERATION
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
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
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = model("User", userSchema);
