import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import fs from "fs";

const verifyJwt = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    // console.log("TOKEN --=-=-=-=-", token);

    const localFilePath = req.file?.path;

    if (!token) {
      fs.unlinkSync(localFilePath); // remove locally saved temp file as the upload operation got failed.
      throw new ApiError(401, "Unauthorized request || Token not found !");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // console.log("decodedToken =-=-=-=-", decodedToken);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    // console.log("user =-=-=", user);

    if (!user) {
      fs.unlinkSync(localFilePath); // remove locally saved temp file as the upload operation got failed.
      throw new ApiError(401, "Invalid Access Token || User not found!");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token!");
  }
});

export { verifyJwt };
