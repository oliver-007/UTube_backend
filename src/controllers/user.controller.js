import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// +++++ ACCESS & REFRESH TOKEN GENERATION SIMULTANEOUSLY +++++
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    // console.log("access token --=-=-=-", accessToken);
    // console.log("refresh token =-=-=-=-=", refreshToken);

    user.refreshToken = refreshToken;
    await user.save({ validatBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access & refresh token ! "
    );
  }
};

// =-=-=-=-=-=-=- REGISTRATION  =-=-=--=-=-=-=-=
const registerUser = asyncHandler(async (req, res) => {
  // - take payload (user details) from req.body ☑️
  // - validation of required field - not empty ☑️
  // - check if user already exists : username, email ☑️
  // - check for avatar ☑️
  // - upload img to cloudinary ☑️
  // - check img uploaded successfully on cludinary ☑️
  // - create user object - create entry in DB ☑️
  // - remove password and refresh token field from response ☑️
  // - check for user creation response ☑️
  // - return response ☑️

  // +++ USER PAYLOAD ++++
  const { username, email, fullName, password } = req.body;
  // console.log("email : ", email);

  // ++++ REQUIRED FILEDS NOT EMPTY VALIDATION +++++
  if (
    [username, email, fullName, password].some((field) => {
      return field?.trim() === "";
    })
  ) {
    throw new ApiError(404, "All fields are required !");
  }

  // +++++ USER EXISTANCE VALIDATION  +++++
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  // console.log("existed user validation", existedUser);

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists !");
  }

  // console.log("req files--", req.files);

  // +++ AVATAR TEMP STORING ON LOCAL STORAGE USING MULTER +++
  let avatarLocalPath;
  // ++++ AVATAR LOCAL PATH VALIDATION +++++
  if (
    req.files &&
    req.files.avatar &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files.avatar[0].path;
  } else {
    throw new ApiError(400, "Avatar is required !");
  }

  // +++ COVERIMAGE TEMP STORING ON LOCAL STORAGE USING MULTER +++
  let coverImageLocalPath;
  // ++++ COVERIMAGE LOCAL PATH VALIDATION +++++
  if (
    req.files &&
    req.files.coverImage &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  // console.log("cover image local path : ", coverImageLocalPath);

  // +++++ AVATAR & COVERIMAGE UPLOAD ON CLOUDINARY ++++
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar upload on Cloudinary failed!");
  }

  let coverImage;
  if (coverImageLocalPath) {
    coverImage = await uploadOnCloudinary(coverImageLocalPath);
  } else null;

  // ++++ USER CREATION ON DB ++++
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  //  ++++++ REMOVE "PASSWORD" & "REFRESH-TOKEN" FIELD FROM RESPONSE ++++
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(
      500,
      "somethisg went worng while registering the user !"
    );
  }

  // +++++ RETURN RESPONSE ++++
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

// =-=-=-=-=-=-=- LOG IN  =-=-=--=-=-=-=-=
const loginUser = asyncHandler(async (req, res) => {
  // payload from req.body
  // email or userbase login
  // find user
  // password check
  // access and refresh token
  // send cookie

  // USER PAYLOAD
  const { email, username, password } = req.body;
  // console.log("email -", email);

  // +++++ EMPTY EMAIL FIELD VALIDATION ++++
  if (!(email || username)) {
    throw new ApiError(400, "Email or Usernam is required !");
  }

  // +++++ FIND USER IN DB ++++
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User not found !");
  }

  // +++++ PASSWORD VALIDATION ++++++
  const isPasswordValid = await user.isPasswordCorrect(password); // !!! IMPORTANT:  this method won't come form mongoose schema Modle. That means it won't come from User modle , it'll come from created user. self created method will found in user , created by client, which will come from database.

  if (!isPasswordValid) {
    throw new ApiError(401, " Invalid credentials - wrong password !");
  }

  // ++++ ACCESS & REFRESH TOKEN GENERATE ++++
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // ++++ LOGGEDIN USER INFO +++++
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // ++++++ SENDING COOKIE ++++++
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in Successfully"
      )
    );
});

// =-=-=-=-=-=-=-= LOG OUT  -=-=-=-=-=-=-=-=-
const logoutUser = asyncHandler(async (req, res) => {
  const userId = await req.user._id; // we can get access of user from auth middleware.

  // console.log("USER ID =-=-=-=", userId);

  // +++++ REMOVING REFRESH TOKEN FORM DB +++++
  await User.findByIdAndUpdate(
    userId,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  // ++++ REMOVING COOKIES +++++
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully. "));
});

// =-=-=-=-=-= REFRSH ACCESS TOKEN GENERATE -=-=-=-=-=-=-
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request ! ");
  }
  try {
    //  +++++++ REFERSH TOKEN VERIFICATION ++++++++
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id).select("-password");
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token !");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is Expired !");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access Token Refreshed."
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

// +++++++++ CHANGE CURRENT PASSWORD +++++++++
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  // console.log("old pass----", oldPassword);
  // console.log("new pass -----", newPassword);
  // console.log("conf pass -----", confirmPassword);

  if (newPassword !== confirmPassword) {
    throw new ApiError(401, "Password doesn't match!");
  }

  const currentUserId = req.user?._id; // with help of "verifyJwt" middleware , we can get current user info, decoding cookie || header info.
  // console.log("currentUserId___", currentUserId);

  const currentUser = await User.findById(currentUserId);
  console.log("currentUser____", currentUser);

  const isHashedPasswordCorrect =
    await currentUser.isPasswordCorrect(oldPassword); // password checking method() from user.model.js

  if (!isHashedPasswordCorrect) {
    throw new ApiError(401, "Invalid old password !");
  }

  currentUser.password = newPassword;
  await currentUser.save({ validateBeforeSave: true });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed Successfully. "));
});

// +++++++ GET CURRENT USER +++++++
const getCurrentUser = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  return res
    .status(200)
    .json(
      new ApiResponse(200, currentUser, "Current User fetched successfully.")
    );
});

// +++++++++ UPDATE FULLNAME & EMAIL +++++++++
const updateUserDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  const currentUserId = req.user?._id;

  if (!(fullName && email)) {
    throw new ApiError(400, "All fields are required ! ");
  }

  const updatedUser = await User.findByIdAndUpdate(
    currentUserId,
    {
      $set: {
        fullName,
        email,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "User details updated successfully.")
    );
});

// ++++++++ UPDATE AVATAR +++++++++
const updateUserAvatar = asyncHandler(async (req, res) => {
  const updatedAvatarLocalPath = req.file?.path;

  // console.log("updated Avatar Local Path ------", updatedAvatarLocalPath);

  if (!updatedAvatarLocalPath) {
    throw new ApiError(400, "updated avatar local path missing !");
  }

  // ++++++ UPDATED FILE UPLOAD ON CLOUDINARY +++++
  const updatedAvatarCloudinaryResponse = await uploadOnCloudinary(
    updatedAvatarLocalPath
  );

  if (!updatedAvatarCloudinaryResponse.url) {
    throw new ApiError(
      400,
      "Updated-avatar upload on cloudinary FAILED ( url & public_id not found) !"
    );
  }

  // console.log(
  //   "updated_Avatar_Cloudinary_Response ----- ",
  //   updatedAvatarCloudinaryResponse
  // );

  const updatedAvatarCloudinaryUrl = updatedAvatarCloudinaryResponse?.url;

  // +++++++ GETTING CURRENT USER-ID BY DECODING TOKEN +++++++
  const currentUserId = req.user?._id; // coming from auth middleware (verifyJwt) .
  const currentUserPreviousAvatarUrl = req.user?.avatar;
  // console.log("currentUserPreviousAvatarUrl --", currentUserPreviousAvatarUrl);

  const updatedUser = await User.findByIdAndUpdate(
    currentUserId,
    {
      $set: {
        avatar: updatedAvatarCloudinaryUrl,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  // +++++++++ DELETE OLD AVATAR IMG FILE FROM CLOUDINARY AFTER UPDATING AVATAR +++++++++

  // EXTRACT PUBLIC-ID FROM URL
  const previousAvatarPublicId = currentUserPreviousAvatarUrl
    .split("/") // Split the URL into an array of path components
    .pop() // Extract the last element (filename)
    .split(".")[0]; // Remove the extension

  // console.log("previousAvatarPublicId ----", previousAvatarPublicId);

  // DELETE PREVIOUS AVATAR FROM CLOUDINARY
  await deleteFromCloudinary(previousAvatarPublicId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "User Avatar updated Successfully ")
    );
});

// +++++++ UPDATE COVER-IMAGE ++++++++
const updatedCoverImage = asyncHandler(async (req, res) => {
  // UPDATED COVER-IMAGE LOCAL FILE PATH
  const updatedCoverImageLocalPath = req.file?.path;
  // console.log("updatedCoverImageLocalPath---", updatedCoverImageLocalPath);

  // PREVIOUS COVER-IMAGE URL FROM DATABASE
  const currentUserPreviousCoverImageUrl = req.user?.coverImage;
  console.log(
    "currentUserPreviousCoverImageUrl ---- ",
    currentUserPreviousCoverImageUrl
  );

  if (!updatedCoverImageLocalPath) {
    throw new ApiError(400, "Updated cover-image local path not found !");
  }

  // UPLOAD ON CLOUDINARY
  const updatedCoverImageCloudinaryResponse = await uploadOnCloudinary(
    updatedCoverImageLocalPath
  );

  if (!updatedCoverImageCloudinaryResponse?.url) {
    throw new ApiError(
      400,
      "Error while uploading updated cover image on cloudinary !"
    );
  }
  // COVER-IMAGE URL FROM CLOUDINARY
  const updatedCoverImageCloudinaryUrl =
    updatedCoverImageCloudinaryResponse?.url;

  // console.log(
  //   "updatedCoverImageCloudinaryUrl ----",
  //   updatedCoverImageCloudinaryUrl
  // );

  // GETTING CURRENT USER-ID BY DECODING TOKEN USING AUTH MIDDLEWARE (verifyJwt())
  const currentUserId = req.user?._id;

  const updatedUser = await User.findByIdAndUpdate(
    currentUserId,
    {
      $set: {
        coverImage: updatedCoverImageCloudinaryUrl,
      },
    },
    { new: true }
  ).select("-password");

  // EXTRACT PUBLIC-ID FROM URL
  const previousCoverImagePublicId = currentUserPreviousCoverImageUrl
    .split("/") // Split the url into an array of path.
    .pop() // Extract the last component (file name)
    .split(".")[0]; // Remove the extension.

  // DELETE PREVIOUS COVER-IMAGE FROM CLOUDINARY
  await deleteFromCloudinary(previousCoverImagePublicId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "cover-image UPDATED Successfully.")
    );
});

// +++++++++ GET USER CHANNEL PROFILE ++++++++++
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user?._id;

  if (!username.trim()) {
    throw new ApiError(400, "username not found !");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [currentUserId, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exists !");
  }

  console.log("channel ----", channel);

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully.")
    );
});

// +++++++++ GET WATCH-HISTORY  ++++++++++
const getWatchHistory = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;

  // ++++++ USING AGGREGATION PIPELINE +++++++
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId.createFromHexString(currentUserId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
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
                $first: "$owner", // for defining a filed use '$' sign before expession.
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Fetched watch histroy Successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetails,
  updateUserAvatar,
  updatedCoverImage,
  getUserChannelProfile,
};
