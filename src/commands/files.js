const File = require('../models/File');
const { escapeMd } = require('../utils/texts');
const { adminOnly } = require('../middleware/adminOnly');

const PAGE_SIZE = 15;

function registerFilesCommand(bot) {
  bot.command('files', adminOnly, async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const page = Math.max(1, parseInt(args[0], 10) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const [files, total] = await Promise.all([
      File.find({ active: true }).sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE),
      File.countDocuments({ active: true }),
    ]);

    if (!files.length) {
      await ctx.reply('📂 No files found on this page.');
      return;
    }

    const lines = files.map(
      (f, i) =>
        `${skip + i + 1}\\. \`${escapeMd(f.slug)}\` — ${escapeMd(f.fileName)} \\(${f.downloadCount} downloads\\)`
    );

    const totalPages = Math.ceil(total / PAGE_SIZE);
    await ctx.replyWithMarkdownV2(
      `📂 *Stored Files* \\(page ${page}/${totalPages}, ${total} total\\)\n\n${lines.join('\n')}\n\n` +
        `Use \`/files ${page + 1}\` for the next page\\.`
    );
  });
}

module.exports = { registerFilesCommand };
