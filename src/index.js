import "dotenv/config";
import dbConnect from "./db/index.js";
import { app } from "./app.js";

// ++++++++ DATABASE CONNECTION ++++++++++++
dbConnect()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`🌍  Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed ! ! ! ", error);
  });
