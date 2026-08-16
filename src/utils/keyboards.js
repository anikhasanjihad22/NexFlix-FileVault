const { Markup } = require('telegraf');
const config = require('../config');
const logger = require('./logger');

/**
 * Applies a Bot API 9.4 color style ('primary' blue, 'success' green,
 * 'danger' red) to a button object. Telegraf's Markup.button.* helpers
 * don't have first-class support for this yet, so we attach the field
 * directly - Telegraf passes button objects straight through to the
 * Telegram API without stripping unknown fields, so this works today
 * even without a Telegraf version bump.
 */
function styled(button, style) {
  return { ...button, style };
}

/**
 * Returns true only for a URL Telegram will actually accept on an inline
 * button (must have a real host). Guards against misconfigured env vars
 * (empty string, "https://", stray whitespace) crashing the whole keyboard -
 * and therefore the whole /start command - the way a bad
 * REQUEST_GROUP_INVITE_LINK did.
 */
function isValidButtonUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    return Boolean(parsed.hostname) && (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'tg:');
  } catch {
    return false;
  }
}

/** Builds a URL button, or null if the configured URL is invalid (logs a warning either way it's skipped). */
function safeUrlButton(text, url, style) {
  if (!isValidButtonUrl(url)) {
    logger.warn(`Skipped inline button "${text}" - invalid or missing URL: ${JSON.stringify(url)}`);
    return null;
  }
  return styled(Markup.button.url(text, url.trim()), style);
}

/** Main /start menu keyboard - color-coded by action type */
function mainMenuKeyboard() {
  const row1 = [safeUrlButton('🌐 WEBSITE', config.websiteUrl, 'primary'), styled(Markup.button.callback('ℹ️ ABOUT', 'menu:about'), 'primary')].filter(Boolean);
  const row2 = [
    styled(Markup.button.callback('📢 DAILY UPDATE', 'menu:daily_update'), 'primary'),
    safeUrlButton('💬 REQUEST GROUP', config.requestGroupUrl, 'primary'),
  ].filter(Boolean);
  const row3 = [styled(Markup.button.callback('❓ HELP', 'menu:help'), 'primary')];

  return Markup.inlineKeyboard([row1, row2, row3].filter((row) => row.length > 0));
}

/** Back-to-menu keyboard, used on About/Help/Daily Update screens */
function backToMenuKeyboard() {
  return Markup.inlineKeyboard([[styled(Markup.button.callback('⬅️ BACK', 'menu:home'), 'primary')]]);
}

/**
 * Force-join keyboard. Shows a Join button per required chat the user hasn't
 * joined (blue), plus a Verify button (green - the "go" action). Chats with
 * no usable URL are skipped as buttons (but still block delivery until
 * membership is verified).
 */
function forceJoinKeyboard(unjoinedChats) {
  const rows = unjoinedChats
    .map((c) => safeUrlButton(c.joinButtonText, c.url, 'primary'))
    .filter(Boolean)
    .map((btn) => [btn]);

  rows.push([styled(Markup.button.callback('✅ VERIFY MEMBERSHIP', 'verify_membership'), 'success')]);
  return Markup.inlineKeyboard(rows);
}

/**
 * Keyboard shown under a delivered file.
 * - FORWARD (green): always shown. Uses Telegram's inline "switch to chat"
 *   flow - tapping it lets the user pick any chat, and the bot answers the
 *   resulting inline query with the same cached file (see
 *   handlers/inlineShare.js). Requires Inline Mode enabled via @BotFather
 *   (/setinline).
 * - DELETE (red): only included when `isAdmin` is true, so regular users
 *   never even see it. The callback handler still re-checks admin status
 *   server-side as defense in depth.
 */
function fileDeliveryKeyboard(slug, isAdmin) {
  const rows = [[styled(Markup.button.switchToChat('↗️ FORWARD', slug), 'success')]];
  if (isAdmin) {
    rows.push([styled(Markup.button.callback('🗑 DELETE', `delete_file:${slug}`), 'danger')]);
  }
  return Markup.inlineKeyboard(rows);
}

/**
 * Result keyboard shown after /genlink or a finished batch - lets the admin
 * copy the share link straight to their clipboard via Telegram's native
 * copy_text button (no need to long-press/select the link text manually).
 */
function linkResultKeyboard(link) {
  return Markup.inlineKeyboard([
    [styled({ text: '📋 COPY LINK', copy_text: { text: link } }, 'success')],
  ]);
}

/** Buttons shown under the running batch progress message while collecting files. */
function batchProgressKeyboard(batchId, paused) {
  const toggleButton = paused
    ? styled(Markup.button.callback('▶️ RESUME', `batch:resume:${batchId}`), 'success')
    : styled(Markup.button.callback('⏸️ PAUSE', `batch:pause:${batchId}`), 'primary');

  return Markup.inlineKeyboard([
    [toggleButton],
    [styled(Markup.button.callback('✅ GENERATE LINK', `batch:generate:${batchId}`), 'success')],
  ]);
}

module.exports = {
  mainMenuKeyboard,
  backToMenuKeyboard,
  forceJoinKeyboard,
  fileDeliveryKeyboard,
  linkResultKeyboard,
  batchProgressKeyboard,
};
