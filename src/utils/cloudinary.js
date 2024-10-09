import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ++++++++++++++ UPLOAD IMAGE FILE ON CLOUDINARY +++++++++++++
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(
      localFilePath,
      // OPTIONS ---
      {
        resource_type: "auto",
        use_filename: true,
        folder: "youtube_clone_backend",
      }
    );
    // success message
    // console.log(
    //   " 📸 File has uploaded successfully : upload cloudinary response ---",
    //   response
    // );

    fs.unlinkSync(localFilePath); // remove locally saved temp file as the upload operation got failed.
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    // remove locally saved temp file as the upload operation got failed.
    console.log("File upload on cloudinary FAILED !!!", error?.message);
    return null;
  }
};

// ++++++++ DELETE FILE FROM CLOUDINARY +++++++++
const deleteFromCloudinary = async (public_id, resource_type) => {
  try {
    if (!public_id) {
      return null;
    }

    // DELETE IMG FILE
    const response = await cloudinary.uploader.destroy(public_id, {
      resource_type, // resource_type : "image" || "video" || "raw" . Default: "image"
    });

    // console.log("Deletion file response ----", response);

    return response;
  } catch (error) {
    console.log("File deletion FAILED : ", error?.message);
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
