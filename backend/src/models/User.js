import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String }, // null for OAuth users
  avatar: { type: String, default: '' }, // Cloudinary URL
  bio: { type: String, default: '', maxlength: 500, trim: true },
  isVerified: { type: Boolean, default: false },
  authProvider: { type: String, enum: ['local', 'google', 'linkedin'], default: 'local' },
  otp: { type: String }, // hashed OTP
  otpExpiry: { type: Date },

  skillsToTeach: [{
    name: String,
    category: String,
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Expert'] }
  }],
  skillsToLearn: [{ name: String, priority: Number }],
  learningStyle: { type: String, enum: ['visual', 'practical', 'discussion'] },

  xpPoints: { type: Number, default: 0 },
  mentorLevel: { type: String, default: 'Novice' },
  badges: [{ name: String, icon: String, earnedAt: Date }],

  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  savedMatches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  totalSessionsCompleted: { type: Number, default: 0 },
  totalHoursTaught: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },

  refreshToken: { type: String },
  onboardingComplete: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
export default User;
