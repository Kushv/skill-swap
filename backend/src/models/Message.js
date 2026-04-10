import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'session-invite', 'system'], default: 'text' },
  sessionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' }, // for session-invite type
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);
export default Message;
