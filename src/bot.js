const { Telegraf } = require('telegraf');
const config = require('./config');
const logger = require('./utils/logger');

const { privateOnly } = require('./middleware/privateOnly');
const { banCheck, trackUser } = require('./middleware/banCheck');

const { registerStartCommand } = require('./commands/start');
const { registerAboutHelpCommands } = require('./commands/aboutHelp');
const { registerGenlinkCommand } = require('./commands/genlink');
const { registerBatchCommand } = require('./commands/batch');
const { registerBroadcastCommand } = require('./commands/broadcast');
const { registerStatsCommand } = require('./commands/stats');
const { registerFilesCommand } = require('./commands/files');
const { registerDeleteCommand } = require('./commands/deleteFile');
const { registerBanCommands } = require('./commands/ban');
const { registerAdminManagementCommands } = require('./commands/admins');
const { registerMyIdCommand } = require('./commands/myid');
const { registerMaintenanceCommand } = require('./commands/maintenance');

const { registerCallbackHandlers } = require('./handlers/callbacks');
const { registerInlineShareHandler } = require('./handlers/inlineShare');

function createBot() {
  const bot = new Telegraf(config.botToken);

  // ---- Global middleware (runs on every update, in order) ----
  // privateOnly MUST be first: it silently drops all group/supergroup/channel
  // activity before anything else runs - no replies, no processing, ever.
  bot.use(privateOnly);
  bot.use(banCheck);
  bot.use(trackUser);

  // ---- Commands ----
  registerStartCommand(bot);
  registerAboutHelpCommands(bot);
  registerMyIdCommand(bot);
  registerMaintenanceCommand(bot);

  // Admin file-intake commands (each also registers a bot.on(media) listener
  // gated by its own in-memory "awaiting" state, so they only fire for the
  // admin who actually triggered /genlink or /batch).
  registerGenlinkCommand(bot);
  registerBatchCommand(bot);

  registerBroadcastCommand(bot);
  registerStatsCommand(bot);
  registerFilesCommand(bot);
  registerDeleteCommand(bot);
  registerBanCommands(bot);
  registerAdminManagementCommands(bot);

  // ---- Callback queries (inline button taps) ----
  registerCallbackHandlers(bot);

  // ---- Inline mode (powers the Forward button) ----
  registerInlineShareHandler(bot);

  // ---- Fallback: media sent by a non-admin, or an admin outside any flow ----
  bot.on(['document', 'video', 'audio', 'photo'], async (ctx) => {
    await ctx.reply(
      'ℹ️ I only deliver files through NexFlix share links. If you\'re an admin, start with /genlink or /batch first.'
    );
  });

  // ---- Unknown commands ----
  bot.on('text', async (ctx, next) => {
    if (ctx.message.text.startsWith('/')) {
      await ctx.reply("❓ Unknown command. Send /help to see how NexFlix FileVault works.");
      return;
    }
    return next();
  });

  bot.catch((err, ctx) => {
    logger.error(`Unhandled error for update ${ctx.updateType}:`, err);
  });

  return bot;
}

module.exports = { createBot };
