require('dotenv').config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value || String(value).trim() === '') {
    throw new Error(`[CONFIG] Missing required environment variable: ${name}`);
  }
  return value;
}

function parseIntEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? fallback : n;
}

function parseIdList(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s));
}

const config = {
  botToken: requireEnv('BOT_TOKEN'),
  mongodbUri: requireEnv('MONGODB_URI'),

  ownerId: Number(requireEnv('OWNER_ID')),
  seedAdminIds: parseIdList(process.env.ADMIN_IDS || ''),

  botName: process.env.BOT_NAME || 'NexFlix FileVault',
  botUsername: process.env.BOT_USERNAME || 'NexFlixFileVaultBot',
  websiteUrl: process.env.WEBSITE_URL || 'https://www.rnexflix.top',
  developerUsername: process.env.DEVELOPER_USERNAME || 'ahr2215',

  welcomeImageFileId: process.env.WELCOME_IMAGE_FILE_ID || '',
  welcomeImageUrl: process.env.WELCOME_IMAGE_URL || '',

  // Shown as a "Join our group" button on the main menu, but NOT enforced
  // as a membership requirement (not in requiredChats below).
  requestGroupUrl: process.env.REQUEST_GROUP_INVITE_LINK || 'https://t.me/+-Bo6KSNJWf9iNjQ1',

  // Only chats listed here are checked by the force-join gate before a file
  // is delivered. To stop requiring a chat, remove its entry from this array
  // (its join button, if any, elsewhere in the bot is unaffected).
  requiredChats: [
    {
      key: 'main_channel',
      label: 'Main Channel',
      chatId: process.env.MAIN_CHANNEL_ID || '@rnexflix',
      url: process.env.MAIN_CHANNEL_URL || 'https://t.me/rnexflix',
      joinButtonText: '📢 JOIN MAIN CHANNEL',
    },
    {
      key: 'daily_update',
      label: 'Daily Update',
      chatId: parseIntEnv('DAILY_UPDATE_CHAT_ID', -1002674103217),
      url: process.env.DAILY_UPDATE_INVITE_LINK || '',
      joinButtonText: '📰 JOIN DAILY UPDATE',
    },
    {
      key: 'request_group',
      label: 'Request Group',
      chatId: parseIntEnv('REQUEST_GROUP_CHAT_ID', -1003666151699),
      url: process.env.REQUEST_GROUP_INVITE_LINK || 'https://t.me/+-Bo6KSNJWf9iNjQ1',
      joinButtonText: '💬 JOIN REQUEST GROUP',
    },
  ],

  autoDeleteSeconds: parseIntEnv('AUTO_DELETE_SECONDS', 600),
  port: parseIntEnv('PORT', 3000),
};

module.exports = config;
