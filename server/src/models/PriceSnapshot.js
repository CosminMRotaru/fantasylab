import mongoose from "mongoose";

const priceItemSchema = new mongoose.Schema(
  {
    fplId: { type: Number, index: true },
    nowCost: Number,
  },
  { _id: false }
);

const priceSnapshotSchema = new mongoose.Schema({
  ts: { type: Date, default: Date.now, index: true },
  players: [priceItemSchema],
});

export default mongoose.model("PriceSnapshot", priceSnapshotSchema);
