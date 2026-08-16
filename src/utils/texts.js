const config = require('../config');

function welcomeMessage() {
  return (
    `👋 *Welcome to ${config.botName}\\!*\n\n` +
    `Your trusted Telegram file delivery assistant for the NexFlix ecosystem\\.\n\n` +
    `Use the buttons below to explore NexFlix, learn how the bot works, or get updates\\.\n\n` +
    `🌐 *Website:* rnexflix\\.top\n` +
    `👨\u200d💻 *Developer:* @${config.developerUsername}`
  );
}

function aboutMessage() {
  return (
    `ℹ️ *About ${config.botName}*\n\n` +
    `${config.botName} securely delivers files stored on Telegram through unique, ` +
    `shareable deep links\\. Every file stays on Telegram's servers — this bot never ` +
    `hosts or exposes files outside of Telegram\\.\n\n` +
    `🌐 *Website:* rnexflix\\.top\n` +
    `👨\u200d💻 *Developer:* @${config.developerUsername}`
  );
}

function helpMessage() {
  return (
    `❓ *How ${config.botName} Works*\n\n` +
    `1\\. Tap a NexFlix share link\n` +
    `2\\. Join the required channels/groups if prompted\n` +
    `3\\. Press ✅ *Verify Membership*\n` +
    `4\\. Receive your file instantly\n\n` +
    `⏱ Delivered files are auto\\-deleted from this chat after *10 minutes* — ` +
    `so forward or save them right away\\.\n\n` +
    `Need more help? Contact the developer: @${config.developerUsername}`
  );
}

function forceJoinMessage() {
  return (
    `🔐 *Membership Required*\n\n` +
    `To receive files from ${config.botName}, please join *all* of the chats below, ` +
    `then press ✅ *Verify Membership*\\.`
  );
}

function fileCaption(fileName, downloadCount) {
  return (
    `✅ *Here is your file*\n\n` +
    `📄 \`${escapeMd(fileName)}\`\n\n` +
    `⏱ This message will be *automatically deleted in 10 minutes* — ` +
    `please forward or save it now using the button below\\.\n\n` +
    `🌐 rnexflix\\.top`
  );
}

/** Bold-formatted version of a file's original caption (or its filename if it had none). */
function boldFileCaption(text) {
  const safe = escapeMd(text && text.trim() ? text.trim() : 'File');
  return `*${safe}*`;
}

/** Intro message sent once before file(s) are delivered. */
function deliveryIntroMessage(fileCount) {
  return fileCount > 1 ? '✅ *Here are your files*' : '✅ *Here is your file*';
}

/** Trailing note sent once after file(s) are delivered, explaining auto-delete. */
function deliveryAutoDeleteNote() {
  return (
    '⏱ This message will be automatically deleted in 10 minutes — ' +
    'please forward or save it now using the button below.'
  );
}

function escapeMd(text) {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

module.exports = {
  welcomeMessage,
  aboutMessage,
  helpMessage,
  forceJoinMessage,
  fileCaption,
  boldFileCaption,
  deliveryIntroMessage,
  deliveryAutoDeleteNote,
  escapeMd,
};
