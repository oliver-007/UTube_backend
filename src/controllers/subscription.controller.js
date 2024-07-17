import { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const toggelSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const currentUserId = req.user?._id;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Channel Id !");
  }

  const isSubscribed = await Subscription.findOne({
    channel: channelId,
    subscriber: currentUserId,
  });

  console.log("isSubscribed =-=-=-", isSubscribed);

  let subscriptionStatus;

  try {
    if (!isSubscribed) {
      await Subscription.create({
        channel: channelId,
        subscriber: currentUserId,
      });

      subscriptionStatus = { isSubscribed: true };
    } else {
      await Subscription.findByIdAndDelete(isSubscribed?._id);

      // --- ANOTHER APPROACH ---
      // await Subscription.deleteOne({
      //   _id: isSubscribed?._id,
      // });
      subscriptionStatus = { isSubscribed: false };
    }
  } catch (error) {
    new ApiError(500, "Subscription Toggled FAILED !!!", error);
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriptionStatus,
        "Subscription Toggled Succcessfully"
      )
    );
});

export { toggelSubscription };
