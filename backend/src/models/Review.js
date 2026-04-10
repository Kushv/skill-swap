import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ratings: {
    teachingQuality: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
    helpfulness: { type: Number, min: 1, max: 5 }
  },
  overallRating: Number, // auto-calculated: average of the 3 above
  reviewText: { type: String, maxlength: 300 },
  skillsEndorsed: [String],
  createdAt: { type: Date, default: Date.now }
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;
