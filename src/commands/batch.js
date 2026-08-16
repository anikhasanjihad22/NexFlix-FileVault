const { generateBatchId } = require('../utils/token');
const { storeFile, buildDeepLink } = require('./genlink');
const { escapeMd } = require('../utils/texts');
const { batchProgressKeyboard, linkResultKeyboard } = require('../utils/keyboards');
const { adminOnly } = require('../middleware/adminOnly');
const Admin = require('../models/Admin');
const logger = require('../utils/logger');

// Active batch session per admin: { batchId, count, paused, chatId, progressMessageId }
const activeBatches = new Map();

function progressText(count, paused) {
  if (paused) {
    return (
      `⏸️ *Batch paused*\n\n` +
      `✅ ${count} file\\(s\\) added so far\\.\n\n` +
      `Tap ▶️ Resume to keep adding files, or ✅ Generate Link to finish now\\.`
    );
  }
  return (
    `📦 *Batch in progress*\n\n` +
    `✅ ${count} file\\(s\\) added so far\\.\n\n` +
    `Send more files, or use the buttons below\\.`
  );
}

/** Sends or edits the running progress message so it doesn't spam a new one per file. */
async function renderProgress(ctx, session) {
  const text = progressText(session.count, session.paused);
  const keyboard = batchProgressKeyboard(session.batchId, session.paused);

  if (session.progressMessageId) {
    try {
      await ctx.telegram.editMessageText(session.chatId, session.progressMessageId, undefined, text, {
        parse_mode: 'MarkdownV2',
        ...keyboard,
      });
      return;
    } catch (err) {
      logger.warn('batch: could not edit progress message, sending a new one:', err.description || err.message);
    }
  }

  const sent = await ctx.replyWithMarkdownV2(text, keyboard);
  session.chatId = ctx.chat.id;
  session.progressMessageId = sent.message_id;
}

function registerBatchCommand(bot) {
  bot.command('batch', adminOnly, async (ctx) => {
    const adminId = ctx.from.id;
    const batchId = generateBatchId();
    const session = { batchId, count: 0, paused: false, chatId: null, progressMessageId: null };
    activeBatches.set(adminId, session);

    await ctx.reply(
      '📦 Batch mode started.\n\nSend all the files you want to include (document, video, audio, or photo), one by one.'
    );
  });

  bot.command('cancel', adminOnly, async (ctx) => {
    const adminId = ctx.from.id;
    if (activeBatches.has(adminId)) {
      activeBatches.delete(adminId);
      await ctx.reply('❌ Batch session cancelled.');
    } else {
      await ctx.reply('ℹ️ No active batch session to cancel.');
    }
  });

  // Runs on every media message; only acts while this admin has an active,
  // unpaused batch. While paused, incoming files are NOT stored - the admin
  // is told to tap Resume first.
  bot.on(['document', 'video', 'audio', 'photo'], async (ctx, next) => {
    const adminId = ctx.from.id;
    const session = activeBatches.get(adminId);
    if (!session) return next();

    const isAdmin = await Admin.findOne({ userId: adminId });
    if (!isAdmin) {
      activeBatches.delete(adminId);
      return next();
    }

    if (session.paused) {
      await ctx.reply('⏸️ This batch is paused. Tap ▶️ Resume on the progress message to keep adding files.');
      return;
    }

    const file = await storeFile(ctx.message, adminId, session.batchId);
    if (!file) {
      await ctx.reply('⚠️ Could not read that file, skipped.');
      return;
    }

    session.count += 1;
    await renderProgress(ctx, session);
  });
}

/** Registers the callback handlers for the Pause / Resume / Generate Link buttons. */
function registerBatchCallbackHandlers(bot) {
  bot.action(/^batch:(pause|resume|generate):(.+)$/, async (ctx) => {
    const action = ctx.match[1];
    const batchId = ctx.match[2];
    const adminId = ctx.from.id;

    const isAdmin = await Admin.findOne({ userId: adminId });
    if (!isAdmin) {
      await ctx.answerCbQuery('🚫 Admins only.', { show_alert: true });
      return;
    }

    const session = activeBatches.get(adminId);
    if (!session || session.batchId !== batchId) {
      await ctx.answerCbQuery('⚠️ This batch session has expired or already finished.', { show_alert: true });
      return;
    }

    if (action === 'pause') {
      session.paused = true;
      await ctx.answerCbQuery('⏸️ Paused.');
      await ctx.editMessageText(progressText(session.count, true), {
        parse_mode: 'MarkdownV2',
        ...batchProgressKeyboard(session.batchId, true),
      }).catch(() => {});
      return;
    }

    if (action === 'resume') {
      session.paused = false;
      await ctx.answerCbQuery('▶️ Resumed.');
      await ctx.editMessageText(progressText(session.count, false), {
        parse_mode: 'MarkdownV2',
        ...batchProgressKeyboard(session.batchId, false),
      }).catch(() => {});
      return;
    }

    // action === 'generate'
    if (session.count === 0) {
      await ctx.answerCbQuery('⚠️ No files added yet.', { show_alert: true });
      return;
    }

    activeBatches.delete(adminId);
    const link = buildDeepLink(`batch_${session.batchId}`);

    await ctx.answerCbQuery('✅ Link generated!');
    await ctx.editMessageText(
      `✅ *BATCH STORED*\n\n📦 ${session.count} file\\(s\\)\n\n🔗 [Open Link](${link})\n\`${escapeMd(link)}\``,
      { parse_mode: 'MarkdownV2', ...linkResultKeyboard(link) }
    ).catch(async () => {
      await ctx.replyWithMarkdownV2(
        `✅ *BATCH STORED*\n\n📦 ${session.count} file\\(s\\)\n\n🔗 [Open Link](${link})\n\`${escapeMd(link)}\``,
        linkResultKeyboard(link)
      );
    });
  });
}

module.exports = { registerBatchCommand, registerBatchCallbackHandlers, activeBatches };
