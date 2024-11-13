import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import {corsOptions} from "./constants/config.js";


import userRoute from "./route/user.route.js";
import { errorMiddleware } from "./middleware/error.js";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

const app = express();
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());


const PORT = process.env.PORT || 4000;
const URI = process.env.MongoDBURI;

// connect to mongoDB
try {
    mongoose.connect(URI);
    console.log("Connected to mongoDB");
} catch (error) {
    console.log("Error: ", error);
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

// defining routes
app.use("/user", userRoute);

app.use(errorMiddleware);

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});