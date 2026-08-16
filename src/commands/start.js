const config = require('../config');
const { welcomeMessage } = require('../utils/texts');
const { mainMenuKeyboard } = require('../utils/keyboards');
const { deliverFileOrGate } = require('../handlers/deepLink');
const Settings = require('../models/Settings');
const logger = require('../utils/logger');

async function sendWelcome(ctx) {
  const caption = welcomeMessage();

  // Build the keyboard defensively - if this throws for any reason, we still
  // want /start to reply with something instead of dying silently.
  let keyboard;
  try {
    keyboard = mainMenuKeyboard();
  } catch (err) {
    logger.error('/start: mainMenuKeyboard() threw, sending without buttons:', err);
    keyboard = {};
  }

  let imageSource = config.welcomeImageFileId;

  if (!imageSource) {
    try {
      const stored = await Settings.findOne({ key: 'welcome_image_file_id' });
      imageSource = (stored && stored.value) || config.welcomeImageUrl;
    } catch (err) {
      logger.warn('Could not read cached welcome image file_id, using URL fallback:', err.message);
      imageSource = config.welcomeImageUrl;
    }
  }

  // Attempt 1: photo with MarkdownV2 caption
  try {
    const sent = await ctx.replyWithPhoto(imageSource, {
      caption,
      parse_mode: 'MarkdownV2',
      ...keyboard,
    });

    if (imageSource === config.welcomeImageUrl && sent.photo && sent.photo.length) {
      const bestPhoto = sent.photo[sent.photo.length - 1];
      Settings.findOneAndUpdate(
        { key: 'welcome_image_file_id' },
        { $set: { value: bestPhoto.file_id } },
        { upsert: true }
      ).catch((err) => logger.warn('Could not cache welcome image file_id:', err.message));
    }
    return; // success
  } catch (err) {
    logger.warn(
      '/start: photo send failed, falling back to text. Reason:',
      err.description || err.message,
      '| imageSource used:', imageSource,
      '| keyboard used:', JSON.stringify(keyboard)
    );
  }

  // Attempt 2: text-only with MarkdownV2 formatting
  try {
    await ctx.replyWithMarkdownV2(caption, keyboard);
    return; // success
  } catch (err) {
    logger.warn(
      '/start: MarkdownV2 text send failed, falling back to plain text. Reason:',
      err.description || err.message,
      '| keyboard used:', JSON.stringify(keyboard)
    );
  }

  // Attempt 3: plain text, no formatting, no keyboard dependency issues -
  // this should succeed as long as the Telegram API itself is reachable.
  try {
    const plainText = `Welcome to ${config.botName}!\n\nUse the buttons below to explore NexFlix, learn how the bot works, or get updates.\n\nWebsite: rnexflix.top\nDeveloper: @${config.developerUsername}`;
    await ctx.reply(plainText, keyboard);
    return;
  } catch (err) {
    logger.warn(
      '/start: plain text with keyboard failed, trying with NO keyboard at all. Reason:',
      err.description || err.message
    );
  }

  // Attempt 4: absolute last resort - no keyboard at all, in case the
  // keyboard object itself is what Telegram is rejecting.
  try {
    await ctx.reply(`Welcome to ${config.botName}! Something is misconfigured with the menu buttons - please contact the developer.`);
  } catch (err) {
    logger.error('/start: ALL delivery attempts failed for user', ctx.from.id, '-', err.description || err.message);
  }
}

function registerStartCommand(bot) {
  bot.start(async (ctx) => {
    try {
      const payload = ctx.startPayload; // text after "?start="

      if (payload && payload.trim()) {
        // Deep link with a file token -> attempt delivery (gated by membership)
        await deliverFileOrGate(ctx, payload.trim());
        return;
      }

      await sendWelcome(ctx);
    } catch (err) {
      logger.error('/start: unexpected top-level error for user', ctx.from.id, '-', err);
      try {
        await ctx.reply('Something went wrong starting the bot. Please try /start again in a moment.');
      } catch (e) {
        // Nothing more we can do.
      }
    }
  });
}

module.exports = { registerStartCommand, sendWelcome };
