const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, unique: true, index: true },
    isOwner: { type: Boolean, default: false },
    addedBy: { type: Number, default: null },
    addedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model('Admin', adminSchema);
