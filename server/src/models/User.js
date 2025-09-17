import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    username: { type: String, unique: true },
    passwordHash: { type: String, required: true },
    state: { type: Object, default: {} },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
