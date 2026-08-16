const File = require('../models/File');
const config = require('../config');
const { generateSlug } = require('../utils/token');
const { escapeMd } = require('../utils/texts');
const { adminOnly } = require('../middleware/adminOnly');
const { linkResultKeyboard } = require('../utils/keyboards');
const Admin = require('../models/Admin');

// Tracks admins who are mid-flow ("send me the file now"). Keyed by userId.
const awaitingFile = new Map();

function extractFileInfo(message) {
  if (message.document) {
    return {
      fileId: message.document.file_id,
      fileUniqueId: message.document.file_unique_id,
      fileName: message.document.file_name || 'document',
      fileSize: message.document.file_size || 0,
      mimeType: message.document.mime_type || 'application/octet-stream',
      mediaType: 'document',
    };
  }
  if (message.video) {
    return {
      fileId: message.video.file_id,
      fileUniqueId: message.video.file_unique_id,
      fileName: message.video.file_name || `video_${message.video.file_unique_id}.mp4`,
      fileSize: message.video.file_size || 0,
      mimeType: message.video.mime_type || 'video/mp4',
      mediaType: 'video',
    };
  }
  if (message.audio) {
    return {
      fileId: message.audio.file_id,
      fileUniqueId: message.audio.file_unique_id,
      fileName: message.audio.file_name || message.audio.title || 'audio',
      fileSize: message.audio.file_size || 0,
      mimeType: message.audio.mime_type || 'audio/mpeg',
      mediaType: 'audio',
    };
  }
  if (message.photo && message.photo.length) {
    const best = message.photo[message.photo.length - 1];
    return {
      fileId: best.file_id,
      fileUniqueId: best.file_unique_id,
      fileName: `photo_${best.file_unique_id}.jpg`,
      fileSize: best.file_size || 0,
      mimeType: 'image/jpeg',
      mediaType: 'photo',
    };
  }
  return null;
}

async function storeFile(message, adminId, batchId = null) {
  const info = extractFileInfo(message);
  if (!info) return null;

  const slug = generateSlug();
  const file = await File.create({
    slug,
    fileId: info.fileId,
    fileUniqueId: info.fileUniqueId,
    fileName: info.fileName,
    fileSize: info.fileSize,
    mimeType: info.mimeType,
    mediaType: info.mediaType,
    caption: message.caption || '',
    batchId,
    createdBy: adminId,
  });

  return file;
}

function buildDeepLink(slug) {
  return `https://t.me/${config.botUsername}?start=${slug}`;
}

function registerGenlinkCommand(bot) {
  bot.command('genlink', adminOnly, async (ctx) => {
    awaitingFile.set(ctx.from.id, true);
    await ctx.reply('📤 Send me the file you want to generate a link for (document, video, audio, or photo).');
  });

  // Runs on every message; only acts if this admin is in the "awaiting file" state.
  bot.on(['document', 'video', 'audio', 'photo'], async (ctx, next) => {
    const adminId = ctx.from.id;
    if (!awaitingFile.get(adminId)) return next();

    // Defense in depth: re-verify admin status even though only admins can set this state.
    const isAdmin = await Admin.findOne({ userId: adminId });
    if (!isAdmin) {
      awaitingFile.delete(adminId);
      return next();
    }

    awaitingFile.delete(adminId);

    const file = await storeFile(ctx.message, adminId);
    if (!file) {
      await ctx.reply('⚠️ Could not read that file. Please try /genlink again.');
      return;
    }

    const link = buildDeepLink(file.slug);
    await ctx.replyWithMarkdownV2(
      `✅ *FILE STORED*\n\n📄 \`${escapeMd(file.fileName)}\`\n\n🔗 [Open Link](${link})\n\`${escapeMd(link)}\``,
      linkResultKeyboard(link)
    );
  });
}

module.exports = { registerGenlinkCommand, storeFile, buildDeepLink, awaitingFile };
