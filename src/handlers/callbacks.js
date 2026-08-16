const config = require('../config');
const { aboutMessage, helpMessage, forceJoinMessage } = require('../utils/texts');
const { mainMenuKeyboard, backToMenuKeyboard, forceJoinKeyboard } = require('../utils/keyboards');
const { checkUserMembership } = require('../utils/membership');
const { getPendingUnlock, clearPendingUnlock, resumeDelivery } = require('./deepLink');
const File = require('../models/File');
const Admin = require('../models/Admin');
const logger = require('../utils/logger');

function registerCallbackHandlers(bot) {
  bot.action('menu:about', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageCaption(aboutMessage(), { parse_mode: 'MarkdownV2', ...backToMenuKeyboard() }).catch(async () => {
      await ctx.replyWithMarkdownV2(aboutMessage(), backToMenuKeyboard());
    });
  });

  bot.action('menu:help', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageCaption(helpMessage(), { parse_mode: 'MarkdownV2', ...backToMenuKeyboard() }).catch(async () => {
      await ctx.replyWithMarkdownV2(helpMessage(), backToMenuKeyboard());
    });
  });

  bot.action('menu:daily_update', async (ctx) => {
    await ctx.answerCbQuery();
    const dailyUpdateChat = config.requiredChats.find((c) => c.key === 'daily_update');
    const text = dailyUpdateChat.url
      ? `📢 *Daily Update*\n\nStay up to date with the latest NexFlix content:\n${dailyUpdateChat.url}`
      : `📢 *Daily Update*\n\nAsk an admin for the current invite link to our Daily Update channel\\.`;
    await ctx.editMessageCaption(text, { parse_mode: 'MarkdownV2', ...backToMenuKeyboard() }).catch(async () => {
      await ctx.replyWithMarkdownV2(text, backToMenuKeyboard());
    });
  });

  bot.action('menu:home', async (ctx) => {
    await ctx.answerCbQuery();
    const { welcomeMessage } = require('../utils/texts');
    await ctx
      .editMessageCaption(welcomeMessage(), { parse_mode: 'MarkdownV2', ...mainMenuKeyboard() })
      .catch(async () => {
        await ctx.replyWithMarkdownV2(welcomeMessage(), mainMenuKeyboard());
      });
  });

  bot.action('verify_membership', async (ctx) => {
    const userId = ctx.from.id;
    const { allJoined, results } = await checkUserMembership(ctx.telegram, userId);

    if (!allJoined) {
      const unjoined = results.filter((r) => !r.joined).map((r) => r.chat);
      await ctx.answerCbQuery('❌ You still need to join all required chats.', { show_alert: true });
      await ctx.editMessageText(forceJoinMessage(), {
        parse_mode: 'MarkdownV2',
        ...forceJoinKeyboard(unjoined),
      }).catch(() => {});
      return;
    }

    await ctx.answerCbQuery('✅ Membership verified!');

    const slug = getPendingUnlock(userId);
    clearPendingUnlock(userId);

    if (!slug) {
      await ctx.editMessageText('✅ *Membership verified\\!* Use your NexFlix share link again to receive the file\\.', {
        parse_mode: 'MarkdownV2',
      }).catch(() => {});
      return;
    }

    await ctx.deleteMessage().catch(() => {});
    await resumeDelivery(ctx, slug);
  });

  /**
   * Delete button on a delivered file. Only rendered for admins in the first
   * place (see utils/keyboards.js), but the admin check is repeated here as
   * defense in depth in case a stale/forwarded button is tapped by someone else.
   */
  bot.action(/^delete_file:(.+)$/, async (ctx) => {
    const userId = ctx.from.id;

    const isAdmin = await Admin.findOne({ userId });
    if (!isAdmin) {
      await ctx.answerCbQuery('🚫 Only admins can delete files.', { show_alert: true });
      return;
    }

    const slug = ctx.match[1];
    const file = await File.findOneAndUpdate({ slug, active: true }, { $set: { active: false } }, { new: true });

    if (!file) {
      await ctx.answerCbQuery('ℹ️ Already deleted or not found.', { show_alert: true });
      return;
    }

    await ctx.answerCbQuery('🗑 File deleted.');
    await ctx.deleteMessage().catch((err) => {
      logger.warn('delete_file: could not delete message after deactivating file:', err.description || err.message);
    });
  });

  /**
   * Batch upload flow buttons (replace the old /done text command).
   * These are matched against the admin's in-memory batch session in
   * commands/batch.js - see registerBatchCallbackHandlers there.
   */
  require('../commands/batch').registerBatchCallbackHandlers(bot);
}

module.exports = { registerCallbackHandlers };
