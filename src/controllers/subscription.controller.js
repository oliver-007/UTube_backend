import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// ++++++++++ TOGGLE SUBSCRIPTON ++++++++
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

// +++++ GET CHANNEL SUBSCRIBERS COUNT ++++++
const getChannelSubscriberCount = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Channel Id !!! ");
  }

  const subscriberCount = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $group: {
        _id: null,
        totalSubscribers: {
          $sum: 1,
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalSubscribers: 1,
      },
    },
  ]);
  // console.log("subscribers =-=-=-  ", subscriberCount[0]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriberCount[0] || { totalSubscribers: 0 },
        "Subscriber count fetched Successfully "
      )
    );
});

// +++++++ GET SUBSCRIBED CHANNELS BY CURRENT-USER +++++++
const getSubscribedChannelListByUser = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;
  console.log("currentUserId =-=-=-  ", currentUserId);

  const subscribedChannelListWithDetails = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(currentUserId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribedTo",
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
        subscribedTo: {
          $first: "$subscribedTo",
        },
      },
    },
  ]);

  // console.log(
  //   "subscribedChannelListWithDetails =-=-=-=- ",
  //   subscribedChannelListWithDetails
  // );

  // ONLY SUBSCRIBED-TO ARRAY
  const subscribedToList = subscribedChannelListWithDetails.map(
    (item) => item?.subscribedTo
  );

  // console.log("subscribedToList =-=-=- ", subscribedToList);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedToList,
        "Subscribed channel of current user fetched successfully "
      )
    );
});

export {
  toggelSubscription,
  getChannelSubscriberCount,
  getSubscribedChannelListByUser,
};
