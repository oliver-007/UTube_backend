import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";

// +++++ GET CHANNEL SUBSCRIBERS COUNT ++++++
// controller to return subscriber-count of a channel
const getChannelSubscriberCount = asyncHandler(async (req, res) => {
  // const { chId } = req.params;
  const { chId, uId } = req.query;

  // console.log("channel-id from query -----", chId);
  // console.log("user-id from query ------", uId);

  if (!isValidObjectId(chId)) {
    throw new ApiError(400, "Invalid Channel Id !!! ");
  }

  const chExist = await User.findById(chId).select(
    "-password -coverImage_public_id -avatar_public_id  "
  );
  // console.log("chExist =======", chExist);

  if (!chExist) {
    throw new ApiError(400, "Channel not found !!!");
  }

  let channelSubscriptionStatus;
  if (isValidObjectId(uId)) {
    // WITHOUT isValidObjectId() IT'LL SHOW ERROR

    const isChannelSubscribed = await Subscription.findOne({
      subscriber: uId,
      channel: chId,
    });
    // ++++++ CHECHING WHETHER CURRENT USER ALREADY SUBSCRIBED THIS CHANNEL OR NOT ++++++++
    if (isChannelSubscribed) {
      channelSubscriptionStatus = { isChannelSubscribed: true };
    } else {
      channelSubscriptionStatus = { isChannelSubscribed: false };
    }
  }

  // FIND OUT SUBSCRIPTION COUNT OF A SPECIFIC CHANNEL, USING CHANNEL-ID, FROM SUBSCRIPTION DOCUMENT USING AGGREGATION PIPELINE
  const subscriberCountResult = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(chId),
      },
    },
    {
      $count: "subscriberCount",
    },
  ]);

  const totalSubscribers =
    // In case no documents are found.
    subscriberCountResult.length > 0
      ? subscriberCountResult[0].subscriberCount
      : 0;

  // ++++++ ALTERNATIVE APPROACH OF AGGREGATION PIPELINE +++++++
  // const subscriberCount = await Subscription.aggregate([
  //   {
  //     $match: {
  //       channel: new mongoose.Types.ObjectId(chId),
  //     },
  //   },
  //   {
  //     $group: {
  //       _id: null,
  //       totalSubscribers: {
  //         $sum: 1,
  //       },
  //     },
  //   },
  //   {
  //     $project: {
  //       _id: 0,
  //       totalSubscribers: 1,
  //     },
  //   },
  // ]);
  // console.log("subscribers =-=-=-  ", subscriberCount[0]);

  return res.status(200).json(
    new ApiResponse(
      200,
      // subscriberCount[0] || { totalSubscribers: 0 },
      { channelSubscriptionStatus, totalSubscribers },
      "Subscriber count fetched Successfully "
    )
  );
});

// ++++++++++ TOGGLE SUBSCRIPTON ++++++++
const toggleSubscription = asyncHandler(async (req, res) => {
  const { chId } = req.params;
  const currentUserId = req.user?._id;
  // console.log("chId ______", chId);
  // console.log("currentUserId =-=-=-", currentUserId);

  if (!isValidObjectId(chId)) {
    throw new ApiError(400, "Invalid Channel Id !");
  }

  const chExist = await User.findById(chId);
  if (!chExist) {
    throw new ApiError(400, "Channel not found !!!");
  }

  const isSubscribed = await Subscription.findOne({
    channel: chId,
    subscriber: currentUserId,
  });

  // console.log("isSubscribed =-=-=-", isSubscribed);

  // TOGGLE SUBSCRIPTION
  let subscriptionStatus;

  if (!isSubscribed) {
    await Subscription.create({
      channel: chId,
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

  // FIND OUT SUBSCRIPTION COUNT OF A SPECIFIC CHANNEL, USING CHANNEL-ID, FROM SUBSCRIPTION DOCUMENT USING AGGREGATION PIPELINE
  const subscriberCountResult = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(chId),
      },
    },
    {
      $count: "subscriberCount",
    },
  ]);

  const totalSubscribers =
    // In case no documents are found.
    subscriberCountResult.length > 0
      ? subscriberCountResult[0].subscriberCount
      : 0;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { subscriptionStatus, totalSubscribers },
        subscriptionStatus.isSubscribed
          ? "You Subscribed this channel."
          : "You Unsbscribed this channel."
      )
    );
});

// +++++++ GET SUBSCRIBED CHANNELS BY CURRENT-USER +++++++
// controller to return channel list to which user has subscribed
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
  toggleSubscription,
  getChannelSubscriberCount,
  getSubscribedChannelListByUser,
};
