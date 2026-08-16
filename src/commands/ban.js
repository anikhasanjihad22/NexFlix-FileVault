const BannedUser = require('../models/BannedUser');
const Admin = require('../models/Admin');
const config = require('../config');
const { adminOnly } = require('../middleware/adminOnly');

function parseUserId(ctx) {
  const args = ctx.message.text.split(' ').slice(1);
  const idArg = args[0];
  const id = Number(idArg);
  if (!idArg || Number.isNaN(id)) return null;
  return { id, reason: args.slice(1).join(' ') || 'No reason provided' };
}

function registerBanCommands(bot) {
  bot.command('ban', adminOnly, async (ctx) => {
    const parsed = parseUserId(ctx);
    if (!parsed) {
      await ctx.reply('Usage: /ban <user_id> [reason]');
      return;
    }

    if (parsed.id === config.ownerId) {
      await ctx.reply('🚫 The owner cannot be banned.');
      return;
    }
    const isAdmin = await Admin.findOne({ userId: parsed.id });
    if (isAdmin) {
      await ctx.reply('🚫 Cannot ban another admin. Remove their admin access first with /removeadmin.');
      return;
    }

    await BannedUser.findOneAndUpdate(
      { userId: parsed.id },
      { $set: { bannedBy: ctx.from.id, reason: parsed.reason, bannedAt: new Date() } },
      { upsert: true }
    );

    await ctx.reply(`🚫 User ${parsed.id} has been banned.\nReason: ${parsed.reason}`);
  });

  bot.command('unban', adminOnly, async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const id = Number(args[0]);
    if (!args[0] || Number.isNaN(id)) {
      await ctx.reply('Usage: /unban <user_id>');
      return;
    }

    const result = await BannedUser.findOneAndDelete({ userId: id });
    if (!result) {
      await ctx.reply('ℹ️ That user is not currently banned.');
      return;
    }

    await ctx.reply(`✅ User ${id} has been unbanned.`);
  });
}

module.exports = { registerBanCommands };
