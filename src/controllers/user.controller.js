import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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
      $set: {
        refreshToken: "",
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

export { registerUser, loginUser, logoutUser, refreshAccessToken };
