import mongoose from "mongoose";

const TeamSchema = new mongoose.Schema(
  {
    fplId: { type: Number, index: true },
    name: String,
    shortName: String,
    strength: Number,
    strengthOverallHome: Number,
    strengthOverallAway: Number,
  },
  { collection: "teams" }
);

export default mongoose.model("Team", TeamSchema);
