/**
 * Global middleware: the bot only ever operates in private (1-on-1) chats.
 * Any update originating from a group, supergroup, or channel is silently
 * dropped here - no reply, no processing, not even for commands. This must
 * be registered FIRST (before banCheck/trackUser) so nothing downstream
 * ever runs for non-private chats.
 */
function privateOnly(ctx, next) {
  const chat =
    ctx.chat ||
    (ctx.update.callback_query && ctx.update.callback_query.message && ctx.update.callback_query.message.chat) ||
    (ctx.update.inline_query && null); // inline queries have no chat - always allowed through

  // Inline queries (used by the Forward button) have no ctx.chat and are not
  // group activity in the traditional sense - let them through untouched.
  if (ctx.update.inline_query) {
    return next();
  }

  if (chat && chat.type !== 'private') {
    return; // silently ignore - no reply of any kind
  }

  return next();
}

module.exports = { privateOnly };
