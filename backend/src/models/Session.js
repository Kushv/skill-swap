import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  scheduledAt: { type: Date, required: true }, // stored in UTC
  duration: { type: Number, enum: [30, 60], required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'], default: 'pending' },
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  skillFocus: { type: String },
  meetingRoomId: { type: String, unique: true, sparse: true }, // UUID generated on confirm
  counterProposal: {
    proposedBy: mongoose.Schema.Types.ObjectId,
    newTime: Date,
    proposedAt: Date
  },
  completedAt: Date,
  xpAwarded: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Session = mongoose.model('Session', sessionSchema);
export default Session;
