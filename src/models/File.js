const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    fileId: { type: String, required: true },
    fileUniqueId: { type: String, default: null },
    fileName: { type: String, default: 'file' },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: 'application/octet-stream' },
    // one of: document, video, audio, photo
    mediaType: { type: String, required: true },
    caption: { type: String, default: '' },
    batchId: { type: String, default: null }, // groups multiple files under one /batch link
    createdBy: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    downloadCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { versionKey: false }
);

module.exports = mongoose.model('File', fileSchema);
