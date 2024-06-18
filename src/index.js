import "dotenv/config";
import express from "express";
import dbConnect from "./db/index.js";

const app = express();

// ++++++++ DATABASE CONNECTION ++++++++++++
dbConnect()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(` Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed ! ! ! ", error);
  });
