const User = require('../models/User');
const BannedUser = require('../models/BannedUser');
const logger = require('../utils/logger');
const { adminOnly } = require('../middleware/adminOnly');

const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 1000; // stay well under Telegram's ~30 msgs/sec global limit

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function registerBroadcastCommand(bot) {
  bot.command('broadcast', adminOnly, async (ctx) => {
    const text = ctx.message.text.split(' ').slice(1).join(' ').trim();
    const replyTarget = ctx.message.reply_to_message;

    if (!text && !replyTarget) {
      await ctx.reply('📣 Usage: reply to a message with /broadcast, or send:\n/broadcast Your message here');
      return;
    }

    const bannedIds = new Set((await BannedUser.find({}, { userId: 1 })).map((b) => b.userId));
    const users = await User.find({}, { userId: 1 });
    const targets = users.map((u) => u.userId).filter((id) => !bannedIds.has(id));

    await ctx.reply(`📣 Starting broadcast to ${targets.length} users...`);

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);

      // eslint-disable-next-line no-await-in-loop
      await Promise.all(
        batch.map(async (userId) => {
          try {
            if (replyTarget) {
              await ctx.telegram.copyMessage(userId, ctx.chat.id, replyTarget.message_id);
            } else {
              await ctx.telegram.sendMessage(userId, text);
            }
            sent += 1;
          } catch (err) {
            failed += 1;
            logger.warn(`[BROADCAST] Failed to reach ${userId}:`, err.description || err.message);
          }
        })
      );

      // eslint-disable-next-line no-await-in-loop
      if (i + BATCH_SIZE < targets.length) await sleep(BATCH_DELAY_MS);
    }

    await ctx.reply(`✅ Broadcast complete.\n\nSent: ${sent}\nFailed: ${failed}\nTotal: ${targets.length}`);
  });
}

module.exports = { registerBroadcastCommand };
