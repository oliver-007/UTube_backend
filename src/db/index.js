import { connect } from "mongoose";
import { DB_NAME } from "../constants.js";

const dbConnect = async () => {
  try {
    const connectionInstance = await connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );

    console.log(
      `🏢  MongoDB connected Success !! DB HOST : ${connectionInstance.connection.host} `
    );
  } catch (error) {
    console.error("MONGODB connection FAILED : ", error);
    process.exit(1);
  }
};

export default dbConnect;
