import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: "16kb",
  })
);
app.use(express.static("public"));
app.use(cookieParser());

// ROUTES IMPORT
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import playlistRouter from "./routes/playList.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";

//++++++++++++ ROUTES DECLARATION +++++++++++++
// +++++ USER ROUTE ++++++++
app.use("/api/v1/users", userRouter);

// ++++++++ VIDEO ROUTE ++++++++
app.use("/api/v1/videos", videoRouter);

// ++++++ SUBSCRIPTION ROUTE +++++++
app.use("/api/v1/subscriptions", subscriptionRouter);

// ++++++ PLAYLIST ROUTE ++++++
app.use("/api/v1/playlists", playlistRouter);

// ++++++++ COMMENT ROUTE ++++++++
app.use("/api/v1/comments", commentRouter);

// ++++++++ LIKE ROUTE +++++++
app.use("/api/v1/likes", likeRouter);

export { app };
