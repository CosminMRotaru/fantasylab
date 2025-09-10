import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    type: { type: String, enum: ['price', 'injury', 'deadline', 'fixture'] },
    payload: {},
    deliveredAt: Date
  },
  { timestamps: true }
);

export default mongoose.model('Alert', alertSchema);