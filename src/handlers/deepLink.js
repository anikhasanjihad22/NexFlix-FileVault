const File = require('../models/File');
const Admin = require('../models/Admin');
const config = require('../config');
const { checkUserMembership } = require('../utils/membership');
const { forceJoinKeyboard, fileDeliveryKeyboard } = require('../utils/keyboards');
const { forceJoinMessage, boldFileCaption, deliveryIntroMessage, deliveryAutoDeleteNote } = require('../utils/texts');
const { isMaintenanceMode } = require('../utils/maintenance');
const logger = require('../utils/logger');

// In-memory map so a "Verify Membership" tap knows which file/batch the user
// was trying to unlock. Keyed by userId. Fine for a single-process deployment;
// for multi-instance scaling this could move to MongoDB/Redis.
const pendingUnlock = new Map();

function setPendingUnlock(userId, slug) {
  pendingUnlock.set(userId, slug);
}

function getPendingUnlock(userId) {
  return pendingUnlock.get(userId);
}

function clearPendingUnlock(userId) {
  pendingUnlock.delete(userId);
}

/**
 * Attempts to deliver the file(s) identified by `slug` to the user.
 * A slug prefixed with "batch_" delivers every file in that batch.
 * If membership is missing, shows the force-join screen instead and
 * remembers the slug so "Verify Membership" can resume delivery.
 */
async function deliverFileOrGate(ctx, slug) {
  const userId = ctx.from.id;

  const isAdmin = Boolean(await Admin.findOne({ userId }));
  if (!isAdmin && (await isMaintenanceMode())) {
    await ctx.reply('🔧 NexFlix FileVault is temporarily under maintenance. Please try this link again in a little while.');
    return;
  }

  const files = await lookupFiles(slug);
  if (!files.length) {
    await ctx.reply('❌ *File Not Found*\nInvalid or expired link\\.', { parse_mode: 'MarkdownV2' });
    return;
  }

  const { allJoined, results } = await checkUserMembership(ctx.telegram, userId);

  if (!allJoined) {
    setPendingUnlock(userId, slug);
    const unjoined = results.filter((r) => !r.joined).map((r) => r.chat);
    await ctx.replyWithMarkdownV2(forceJoinMessage(), forceJoinKeyboard(unjoined));
    return;
  }

  clearPendingUnlock(userId);
  await resumeDelivery(ctx, slug);
}

async function lookupFiles(slug) {
  if (slug.startsWith('batch_')) {
    const batchId = slug.replace('batch_', '');
    return File.find({ batchId, active: true }).sort({ createdAt: 1 });
  }
  const single = await File.findOne({ slug, active: true });
  return single ? [single] : [];
}

/**
 * Fetches and sends the file(s) for a slug (single or batch_), no membership
 * check (that's already been done by the time this runs). Structure:
 *   1. One intro message ("Here is your file" / "Here are your files")
 *   2. One message per file, with its ORIGINAL caption shown in bold
 *   3. One trailing note explaining the 10-minute auto-delete
 * All of the above are deleted together after AUTO_DELETE_SECONDS.
 */
async function resumeDelivery(ctx, slug) {
  const files = await lookupFiles(slug);

  if (!files.length) {
    await ctx.reply('❌ *File Not Found*\nInvalid or expired link\\.', { parse_mode: 'MarkdownV2' });
    return;
  }

  const isAdmin = Boolean(await Admin.findOne({ userId: ctx.from.id }));
  const messageIds = [];

  try {
    const intro = await ctx.replyWithMarkdownV2(deliveryIntroMessage(files.length));
    messageIds.push(intro.message_id);
  } catch (err) {
    logger.warn('resumeDelivery: intro message failed:', err.description || err.message);
  }

  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    const messageId = await sendStoredFile(ctx, file, isAdmin);
    if (messageId) messageIds.push(messageId);
    // eslint-disable-next-line no-await-in-loop
    file.downloadCount += 1;
    // eslint-disable-next-line no-await-in-loop
    await file.save().catch((err) => logger.warn('Could not increment downloadCount:', err.message));
  }

  try {
    const note = await ctx.reply(deliveryAutoDeleteNote());
    messageIds.push(note.message_id);
  } catch (err) {
    logger.warn('resumeDelivery: auto-delete note failed:', err.description || err.message);
  }

  if (messageIds.length) {
    scheduleAutoDelete(ctx.telegram, ctx.chat.id, messageIds);
  }
}

/** Sends one Telegram-hosted file by its stored file_id. Returns the sent message_id, or null on failure. */
async function sendStoredFile(ctx, file, isAdmin) {
  const caption = boldFileCaption(file.caption || file.fileName);
  const keyboard = fileDeliveryKeyboard(file.slug, isAdmin);
  const opts = { caption, parse_mode: 'MarkdownV2', ...keyboard };

  try {
    let sentMessage;
    switch (file.mediaType) {
      case 'video':
        sentMessage = await ctx.telegram.sendVideo(ctx.chat.id, file.fileId, opts);
        break;
      case 'audio':
        sentMessage = await ctx.telegram.sendAudio(ctx.chat.id, file.fileId, opts);
        break;
      case 'photo':
        sentMessage = await ctx.telegram.sendPhoto(ctx.chat.id, file.fileId, opts);
        break;
      case 'document':
      default:
        sentMessage = await ctx.telegram.sendDocument(ctx.chat.id, file.fileId, opts);
        break;
    }
    return sentMessage.message_id;
  } catch (err) {
    logger.error('Failed to send stored file:', err.description || err.message);
    await ctx.reply('⚠️ Something went wrong sending one of your files. Please try the link again in a moment.').catch(() => {});
    return null;
  }
}

/** Deletes a batch of delivered messages together after AUTO_DELETE_SECONDS. DB records are untouched. */
function scheduleAutoDelete(telegram, chatId, messageIds) {
  setTimeout(async () => {
    for (const messageId of messageIds) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await telegram.deleteMessage(chatId, messageId);
      } catch (err) {
        logger.warn(`Auto-delete failed for message ${messageId} in chat ${chatId}:`, err.description || err.message);
      }
    }
  }, config.autoDeleteSeconds * 1000);
}

module.exports = {
  deliverFileOrGate,
  resumeDelivery,
  sendStoredFile,
  setPendingUnlock,
  getPendingUnlock,
  clearPendingUnlock,
};
