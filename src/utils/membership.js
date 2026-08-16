const config = require('../config');

// Statuses that count as "joined"
const VALID_STATUSES = new Set(['creator', 'administrator', 'member', 'restricted']);
// Statuses that count as "not joined"
const INVALID_STATUSES = new Set(['left', 'kicked']);

/**
 * Checks a single chat membership for a user.
 * Returns { chat, joined, status, error }
 */
async function checkSingleChat(telegram, chat, userId) {
  try {
    const member = await telegram.getChatMember(chat.chatId, userId);
    const status = member.status;

    if (VALID_STATUSES.has(status)) {
      return { chat, joined: true, status, error: null };
    }
    if (INVALID_STATUSES.has(status)) {
      return { chat, joined: false, status, error: null };
    }
    // Unknown status -> treat as not joined, but surface it
    return { chat, joined: false, status, error: null };
  } catch (err) {
    // Bot not admin in chat, chat not found, user never started a chat with bot, etc.
    console.error(`[MEMBERSHIP] Error checking chat "${chat.label}" (${chat.chatId}) for user ${userId}:`, err.description || err.message);
    return { chat, joined: false, status: 'error', error: err.description || err.message };
  }
}

/**
 * Verifies a user has joined ALL required chats.
 * Returns { allJoined: boolean, results: Array }
 */
async function checkUserMembership(telegram, userId) {
  const results = await Promise.all(
    config.requiredChats.map((chat) => checkSingleChat(telegram, chat, userId))
  );

  const allJoined = results.every((r) => r.joined);
  return { allJoined, results };
}

module.exports = { checkUserMembership };
