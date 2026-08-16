const BannedUser = require('../models/BannedUser');
const User = require('../models/User');

/** Blocks any update from a banned user. */
async function banCheck(ctx, next) {
  const userId = ctx.from && ctx.from.id;
  if (!userId) return next();

  const banned = await BannedUser.findOne({ userId });
  if (banned) {
    // Silently ignore banned users (no reply, to avoid revealing bot behavior)
    return;
  }
  return next();
}

/** Tracks/updates the user record on every interaction (for /stats and /broadcast). */
async function trackUser(ctx, next) {
  const from = ctx.from;
  if (from && !from.is_bot) {
    User.findOneAndUpdate(
      { userId: from.id },
      {
        $set: {
          username: from.username || null,
          firstName: from.first_name || null,
          lastName: from.last_name || null,
          lastActiveAt: new Date(),
        },
        $setOnInsert: { joinedAt: new Date() },
      },
      { upsert: true }
    ).catch((err) => console.error('[TRACK_USER] Failed to upsert user:', err.message));
  }
  return next();
}

module.exports = { banCheck, trackUser };
