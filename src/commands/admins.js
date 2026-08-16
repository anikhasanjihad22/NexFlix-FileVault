const Admin = require('../models/Admin');
const config = require('../config');
const { ownerOnly } = require('../middleware/adminOnly');

function registerAdminManagementCommands(bot) {
  bot.command('addadmin', ownerOnly, async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const id = Number(args[0]);
    if (!args[0] || Number.isNaN(id)) {
      await ctx.reply('Usage: /addadmin <user_id>');
      return;
    }

    const existing = await Admin.findOne({ userId: id });
    if (existing) {
      await ctx.reply('ℹ️ That user is already an admin.');
      return;
    }

    await Admin.create({ userId: id, isOwner: false, addedBy: ctx.from.id });
    await ctx.reply(`✅ User ${id} has been granted admin access.`);
  });

  bot.command('removeadmin', ownerOnly, async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const id = Number(args[0]);
    if (!args[0] || Number.isNaN(id)) {
      await ctx.reply('Usage: /removeadmin <user_id>');
      return;
    }

    if (id === config.ownerId) {
      await ctx.reply('🚫 The owner cannot be removed.');
      return;
    }

    const result = await Admin.findOneAndDelete({ userId: id, isOwner: false });
    if (!result) {
      await ctx.reply('⚠️ That user is not a removable admin.');
      return;
    }

    await ctx.reply(`✅ User ${id}'s admin access has been revoked.`);
  });

  bot.command('admins', async (ctx) => {
    const admins = await Admin.find().sort({ isOwner: -1, addedAt: 1 });
    if (!admins.length) {
      await ctx.reply('No admins configured.');
      return;
    }

    const lines = admins.map((a) => `• ${a.userId}${a.isOwner ? ' 👑 (owner)' : ''}`);
    await ctx.reply(`🛡 Admins:\n\n${lines.join('\n')}`);
  });
}

module.exports = { registerAdminManagementCommands };
