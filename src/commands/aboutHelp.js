const { aboutMessage, helpMessage } = require('../utils/texts');
const { backToMenuKeyboard } = require('../utils/keyboards');

function registerAboutHelpCommands(bot) {
  bot.command('about', async (ctx) => {
    await ctx.replyWithMarkdownV2(aboutMessage(), backToMenuKeyboard());
  });

  bot.command('help', async (ctx) => {
    await ctx.replyWithMarkdownV2(helpMessage(), backToMenuKeyboard());
  });
}

module.exports = { registerAboutHelpCommands };
