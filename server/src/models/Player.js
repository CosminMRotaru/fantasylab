import mongoose from "mongoose";

const playerSchema = new mongoose.Schema(
  {
    fplId: { type: Number, index: true },
    firstName: String,
    secondName: String,
    webName: String,
    team: { type: Number, index: true },
    position: Number,
    nowCost: Number,
    selectedByPercent: String,
    minutes: Number,
    totalPoints: Number,
    xP: Number,
  },
  { timestamps: true }
);

export default mongoose.model("Player", playerSchema);
