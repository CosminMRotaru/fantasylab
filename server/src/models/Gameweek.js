import mongoose from "mongoose";

const gwSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    name: String,
    deadlineTime: Date,
    finished: Boolean,
    dataFrom: String,
  },
  { timestamps: true }
);

export default mongoose.model("Gameweek", gwSchema);
