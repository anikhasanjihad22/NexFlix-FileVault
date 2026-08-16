const User = require('../models/User');
const File = require('../models/File');
const Admin = require('../models/Admin');
const BannedUser = require('../models/BannedUser');
const { adminOnly } = require('../middleware/adminOnly');
const { formatBytes } = require('../utils/format');

function registerStatsCommand(bot) {
  bot.command('stats', adminOnly, async (ctx) => {
    const [userCount, fileCount, adminCount, bannedCount, downloadAgg, sizeAgg] = await Promise.all([
      User.countDocuments(),
      File.countDocuments({ active: true }),
      Admin.countDocuments(),
      BannedUser.countDocuments(),
      File.aggregate([{ $group: { _id: null, total: { $sum: '$downloadCount' } } }]),
      File.aggregate([{ $match: { active: true } }, { $group: { _id: null, total: { $sum: '$fileSize' } } }]),
    ]);

    const totalDownloads = (downloadAgg[0] && downloadAgg[0].total) || 0;
    const totalStorageBytes = (sizeAgg[0] && sizeAgg[0].total) || 0;

    await ctx.replyWithMarkdownV2(
      `📊 *NexFlix FileVault \\- Stats*\n\n` +
        `👥 Users: *${userCount}*\n` +
        `📄 Files stored: *${fileCount}*\n` +
        `💾 Storage used: *${formatBytes(totalStorageBytes).replace('.', '\\.')}*\n` +
        `⬇️ Total downloads: *${totalDownloads}*\n` +
        `🛡 Admins: *${adminCount}*\n` +
        `🚫 Banned users: *${bannedCount}*\n\n` +
        `_Storage figure is the sum of stored files' sizes on Telegram \\- not your MongoDB database size, which stays tiny since only file references are stored\\._`
    );
  });
}

module.exports = { registerStatsCommand };
