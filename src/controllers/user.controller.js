import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose, { isValidObjectId } from "mongoose";
import { pagination } from "../utils/pagination.js";

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
  // console.log("username  =-=: ", username);

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
    avatar: avatar?.url,
    avatar_public_id: avatar?.public_id,
    coverImage: coverImage?.url || "",
    coverImage_public_id: coverImage?.public_id || "",
    email,
    password,
    username,
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
    "-password -refreshToken -watchHistory -updatedAt -createdAt -coverImage_public_id -avatar_public_id"
  );

  // ++++++ SENDING COOKIE ++++++
  const options = {
    httpOnly: true,
    secure: true, // for https
    // secure: false, // for http. development phase
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
  // console.log("currentUser____", currentUser);

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
  ).select("-password -coverImage_public_id -avatar_public_id -refreshToken ");

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
  const currentUserPreviousAvatarPublicId = req.user?.avatar_public_id;
  // console.log(
  //   "currentUserPreviousAvatar public id =-=-=- --",
  //   currentUserPreviousAvatarPublicId
  // );

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

  // DELETE PREVIOUS AVATAR FROM CLOUDINARY AFTER UPDATING AVATAR
  await deleteFromCloudinary(currentUserPreviousAvatarPublicId, "image");

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
  const currentUserPreviousCoverImagePublicId = req.user?.coverImage_public_id;
  // console.log(
  //   "currentUserPreviousCoverImagePublicId ---- ",
  //   currentUserPreviousCoverImagePublicId
  // );

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

  // DELETE PREVIOUS COVER-IMAGE FROM CLOUDINARY
  await deleteFromCloudinary(currentUserPreviousCoverImagePublicId, "image");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "cover-image UPDATED Successfully.")
    );
});

// +++++++++ GET USER CHANNEL PROFILE ++++++++++
const getUserChannelProfile = asyncHandler(async (req, res) => {
  // const {chId,  username } = req.params;
  const { chId, currUId } = req.query;

  // console.log("chId from getChannelProfile ********  ", chId);
  // console.log("currUId from getChannelProfile ********  ", currUId);

  // const currentUserId = req.user?._id;

  // if (!username.trim()) {
  //   throw new ApiError(400, "username is required !");
  // }

  if (!chId) {
    throw new ApiError(400, "Channel-Id is required !");
  }

  if (!isValidObjectId(chId)) {
    throw new ApiError(400, "Invalid Channel Id !");
  }

  const channel = await User.aggregate([
    {
      $match: {
        // username: username?.toLowerCase(),
        _id: new mongoose.Types.ObjectId(chId),
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
        isSubscribed: currUId
          ? {
              $cond: {
                if: {
                  $in: [
                    new mongoose.Types.ObjectId(currUId),
                    {
                      $map: {
                        input: "$subscribers",
                        as: "subscriber",
                        in: "$$subscriber.subscriber",
                      },
                    },
                  ],
                },
                then: true,
                else: false,
              },
            }
          : false,
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

  // console.log("channel ----", channel);

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "Channel profile fetched successfully.")
    );
});

// +++++++++ GET WATCH-HISTORY  ++++++++++
const getWatchHistory = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;
  const { page, limit } = req.query; // here 'limit' porps is inActive, but keep this props for future modification, which'll come from frontend.

  // ********* WATCHED-VIDEO OF CURRENT USER COUNT **********
  const currUser = await User.findById(currentUserId);
  const totalWatchedVideo = currUser.watchHistory.length || 0;

  // console.log("totalWatchedVideo ******** ", totalWatchedVideo);

  // ******** PAGINATION ********
  const { parsedLimitForPerPage, skip, totalPages } = await pagination(
    page,
    limit,
    totalWatchedVideo
  );

  // console.log("parsedLimitForPerPage ***********", parsedLimitForPerPage);

  // ++++++ USING AGGREGATION PIPELINE +++++++
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(currentUserId),
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
          {
            $skip: skip,
          },
          {
            $limit: parsedLimitForPerPage,
          },
          {
            $sort: {
              updatedAt: -1,
            },
          },
        ],
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        watchHistory: user[0].watchHistory,
        currentPage: parseInt(page),
        totalPages,
      },
      "Fetched watch histroy Successfully"
    )
  );
});

// *********** REMOVE VIDEO-ID FORM WATCH-HISTORY  ***********
const removeVIdFromWatchHistory = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;
  const { vId } = req.query;

  // console.log("curr user id from remove wHV ------", currentUserId);

  if (!vId) {
    throw new ApiError(400, "Video-id is required !");
  }

  if (!isValidObjectId(vId)) {
    throw new ApiError(400, "Invalid video id !");
  }

  const currentUser = await User.findById(currentUserId);
  // console.log(
  //   "current user from deleteVIdFromWatchHistory **********",
  //   currentUser
  // );

  const videoExistInWatchHistoryList = currentUser.watchHistory.includes(vId);

  let removalState;

  if (videoExistInWatchHistoryList) {
    await User.findByIdAndUpdate(
      currentUserId,
      {
        $pull: {
          watchHistory: vId,
        },
      },
      { new: true }
    );
    removalState = { isRemoved: true };
  } else {
    removalState = { isRemoved: false };
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      removalState,

      !videoExistInWatchHistoryList
        ? "Video not found in your watch-history !"
        : removalState.isRemoved
          ? "Video removed form watch-history successfully."
          : "Failed to remove video from watch-history ! "
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
  getWatchHistory,
  removeVIdFromWatchHistory,
};
