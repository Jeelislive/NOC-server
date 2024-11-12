import jwt from "jsonwebtoken";
import { v4 as uuid } from 'uuid'; 
import cloudinary from 'cloudinary';
import dotenv from "dotenv";
dotenv.config();


// Cookie options for JWT token
const cookieOptions = {
  maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
  sameSite: "None",
  httpOnly: true,
  secure: true,
};

// Function to send JWT token as a cookie
const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  
  return res.status(code).cookie("nocapptoken", token, cookieOptions).json({
    success: true,
    user,
    message,
  });
};

// Function to upload files to Cloudinary
const uploadFilesToCloudinary = async (files = [], userFolder) => {
  const uploadPromises = files.map((file) => {
    console.log('File object:', file); // Log the file object for debugging
    return new Promise((resolve, reject) => {
      if (!file || !file.buffer) {
        console.error('File or buffer is undefined', file);
        return reject(new Error('File or buffer is undefined'));
      }

      const uploadStream = cloudinary.v2.uploader.upload_stream(
        {
          resource_type: "auto",
          public_id: uuid(), // Generate a unique public ID for each file
          folder: `user_uploads/${userFolder}`, 
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            return reject(new Error(`Cloudinary upload failed: ${error.message}`));
          }
          resolve(result);
        }
      );

      uploadStream.end(file.buffer); // End the stream with the file buffer
    });
  });

  try {
    const results = await Promise.all(uploadPromises);
    console.log('Cloudinary upload results:', results); // Log the upload results for debugging
    return results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));
  } catch (error) {
    console.error("Error uploading files to Cloudinary:", error);
    throw new Error(`Error uploading files to Cloudinary: ${error.message}`);
  }
};



export { sendToken, cookieOptions, uploadFilesToCloudinary };
