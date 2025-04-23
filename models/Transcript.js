import mongoose from 'mongoose';

const TranscriptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  summaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Summary',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  seen: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model('Transcript', TranscriptSchema);
