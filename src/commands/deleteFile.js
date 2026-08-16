const File = require('../models/File');
const { escapeMd } = require('../utils/texts');
const { adminOnly } = require('../middleware/adminOnly');

function registerDeleteCommand(bot) {
  bot.command('delete', adminOnly, async (ctx) => {
    const slug = ctx.message.text.split(' ').slice(1).join(' ').trim();
    if (!slug) {
      await ctx.reply('Usage: /delete <slug>\n\nFind slugs with /files');
      return;
    }

    const file = await File.findOneAndUpdate({ slug, active: true }, { $set: { active: false } }, { new: true });
    if (!file) {
      await ctx.reply('⚠️ No active file found with that slug.');
      return;
    }

    await ctx.replyWithMarkdownV2(`🗑 Deactivated: \`${escapeMd(file.fileName)}\` \\(\`${escapeMd(slug)}\`\\)\n\nIts share link will now show "File Not Found".`);
  });
}

module.exports = { registerDeleteCommand };
