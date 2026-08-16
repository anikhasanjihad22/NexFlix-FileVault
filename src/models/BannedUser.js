const mongoose = require('mongoose');

const bannedUserSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, unique: true, index: true },
    bannedBy: { type: Number, required: true },
    reason: { type: String, default: 'No reason provided' },
    bannedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model('BannedUser', bannedUserSchema);
