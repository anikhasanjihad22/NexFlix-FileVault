/**
 * /myid (alias /whoami) - shows the requester their own Telegram user ID.
 * Genuinely useful: admins constantly need a user's numeric ID for
 * /ban, /addadmin, etc., and this saves them a trip to a third-party bot.
 */
function registerMyIdCommand(bot) {
  bot.command(['myid', 'whoami'], async (ctx) => {
    const user = ctx.from;
    const lines = [`🆔 Your Telegram ID: \`${user.id}\``];
    if (user.username) lines.push(`Username: @${user.username}`);
    if (user.first_name) lines.push(`Name: ${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`);
    await ctx.replyWithMarkdownV2(lines.join('\n'));
  });
}

module.exports = { registerMyIdCommand };
