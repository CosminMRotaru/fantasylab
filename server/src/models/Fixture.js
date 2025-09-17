import mongoose from "mongoose";

const fixtureSchema = new mongoose.Schema(
  {
    fplId: { type: Number, index: true },
    event: { type: Number, index: true },
    kickoffTime: Date,
    homeTeam: Number,
    awayTeam: Number,
    homeStrength: Number,
    awayStrength: Number,
    finished: Boolean,
    difficultyHome: Number,
    difficultyAway: Number,
  },
  { timestamps: true }
);

export default mongoose.model("Fixture", fixtureSchema);
