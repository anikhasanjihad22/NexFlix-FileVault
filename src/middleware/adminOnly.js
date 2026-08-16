const Admin = require('../models/Admin');

/**
 * Telegraf middleware: only allows the handler to run if the sender is a
 * stored admin (owner counts as admin too, since owner is seeded into Admin).
 */
async function adminOnly(ctx, next) {
  const userId = ctx.from && ctx.from.id;
  if (!userId) return;

  const admin = await Admin.findOne({ userId });
  if (!admin) {
    await ctx.reply('🚫 This command is restricted to NexFlix FileVault admins only.');
    return;
  }
  return next();
}

/** Owner-only middleware, for /addadmin, /removeadmin */
async function ownerOnly(ctx, next) {
  const userId = ctx.from && ctx.from.id;
  if (!userId) return;

  const admin = await Admin.findOne({ userId, isOwner: true });
  if (!admin) {
    await ctx.reply('🚫 This command is restricted to the bot owner only.');
    return;
  }
  return next();
}

module.exports = { adminOnly, ownerOnly };
