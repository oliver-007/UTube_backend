import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { registerUser };
