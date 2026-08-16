const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, unique: true, index: true },
    username: { type: String, default: null },
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    joinedAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model('User', userSchema);
