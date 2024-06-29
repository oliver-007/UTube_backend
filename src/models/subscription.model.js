import { Schema, model } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, // one who is subscribing
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, // one to whom "Subscriber" is subscribing.
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const Subscription = model("Subscription", subscriptionSchema);
