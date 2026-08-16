const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');
const { connectDatabase } = require('./database');
const { bootstrapAdmins } = require('./bootstrap');
const { createBot } = require('./bot');

let botStatus = 'starting'; // starting | polling | error

function startHealthServer() {
  const app = express();

  app.get('/', (req, res) => {
    res.status(200).send(`${config.botName} is running. Bot status: ${botStatus}`);
  });

  // Always 200 once the process is up, regardless of bot polling status.
  // This is what unblocks Render's deploy (and its port scan) immediately,
  // instead of waiting on Telegram's getUpdates handshake to succeed first.
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', bot: config.botUsername, botStatus });
  });

  const server = app.listen(config.port, () => {
    logger.info(`Health check server listening on port ${config.port}.`);
  });

  return server;
}

/**
 * Launches the bot with retry/backoff. A 409 Conflict means Telegram still
 * has another instance's long-poll connection open (typically the previous
 * Render deploy, mid-shutdown) - it is transient, so we retry instead of
 * crashing the whole process.
 */
async function launchBotWithRetry(bot, attempt = 1) {
  try {
    // bot.launch() resolves once polling starts; it does not block forever.
    await bot.launch();
    botStatus = 'polling';
    logger.info('Bot launched successfully via polling.');
    logger.info(`Owner ID: ${config.ownerId}`);
    logger.info(`Required chats: ${config.requiredChats.map((c) => c.label).join(', ')}`);

    // Professional touch: let the owner know via DM that the bot is live,
    // without needing to check Render's logs. Fails silently if the owner
    // has never started a private chat with the bot yet.
    bot.telegram
      .sendMessage(config.ownerId, `✅ ${config.botName} is now online and polling for updates.`)
      .catch((err) => logger.warn('Could not send startup DM to owner:', err.description || err.message));
  } catch (err) {
    botStatus = 'error';
    const isConflict = err && err.response && err.response.error_code === 409;
    const delayMs = Math.min(30000, 3000 * attempt);

    if (isConflict) {
      logger.warn(
        `Telegram 409 Conflict (another instance still polling) - retrying in ${delayMs / 1000}s (attempt ${attempt})...`
      );
    } else {
      logger.error(`Bot launch failed - retrying in ${delayMs / 1000}s (attempt ${attempt}):`, err.message || err);
    }

    setTimeout(() => launchBotWithRetry(bot, attempt + 1), delayMs);
  }
}

async function main() {
  logger.info(`Starting ${config.botName} (@${config.botUsername})...`);

  // Start the health server FIRST so Render's port scan / health check
  // succeeds immediately. This lets Render finish the deploy (and tear
  // down the previous instance) even while the bot is still retrying its
  // Telegram connection - which is exactly what breaks a 409 deadlock
  // between two overlapping deploys.
  const server = startHealthServer();

  await connectDatabase();
  logger.info('Database connected.');

  await bootstrapAdmins();
  logger.info('Admin bootstrap complete.');

  const bot = createBot();

  // Polling is used (per spec) for stability on Render's free tier -
  // no webhook/public URL needed. Not awaited: failures here must not
  // crash the process or take down the health server.
  launchBotWithRetry(bot);

  // Graceful shutdown
  const shutdown = (signal) => {
    logger.info(`${signal} received, stopping bot...`);
    try {
      bot.stop(signal);
    } catch (e) {
      // ignore - bot may not have finished launching yet
    }
    server.close(() => process.exit(0));
    // Fallback in case server.close hangs
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
