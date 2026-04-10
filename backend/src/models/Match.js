import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // always exactly 2
  status: { type: String, enum: ['pending', 'connected', 'rejected', 'saved'], default: 'pending' },
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  connectedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const Match = mongoose.model('Match', matchSchema);
export default Match;
