import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import { TryCatch } from "./error.js";
import { NOCAPPTOKEN } from "../constants/config.js";
import env from "dotenv";
env.config();

const isAuthenticated = TryCatch(async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies[NOCAPPTOKEN];
    // console.log(token);
   
   if (!token) return next(new ErrorHandler("Please login to access this route", 401));

const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decodedData._id;

    next();
});   

export { isAuthenticated };