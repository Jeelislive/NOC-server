import mongoose, { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
const { hash } = bcrypt;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending', 
  },
  applicationCount: {
    type: Number,
    default: 0, 
  },
  renewalCount: {
    type: Number,
    default: 0,
  },
  isCheckListDone: { type: Boolean, default: false },
}, {
  timestamps: true,
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await hash(this.password, 10);
});

const User = mongoose.model("User", userSchema);
export default User;
