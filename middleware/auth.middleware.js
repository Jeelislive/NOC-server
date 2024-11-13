import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import { TryCatch } from "./error.js";
import env from "dotenv";
env.config();

const isAuthenticated = TryCatch(async (req, res, next) => {
  const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];
  
  if (!token) {
    return next(new ErrorHandler("Please login to access this route", 401));
  }

  try {
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decodedData._id; 
    next();
  } catch (error) {
    return next(new ErrorHandler("Invalid or expired token", 401));
  }
});

export { isAuthenticated };
