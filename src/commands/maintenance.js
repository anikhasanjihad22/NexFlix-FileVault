const { ownerOnly } = require('../middleware/adminOnly');
const { isMaintenanceMode, setMaintenanceMode } = require('../utils/maintenance');

/**
 * /maintenance [on|off] - owner-only toggle. While enabled, regular users
 * hitting a share link get a friendly "under maintenance" message instead
 * of the normal delivery flow (admins are unaffected, so they can keep
 * testing/uploading during a deploy or incident). Useful during Render
 * redeploys or when diagnosing an issue without users hitting broken flows.
 */
function registerMaintenanceCommand(bot) {
  bot.command('maintenance', ownerOnly, async (ctx) => {
    const arg = (ctx.message.text.split(' ')[1] || '').toLowerCase();

    if (arg === 'on') {
      await setMaintenanceMode(true);
      await ctx.reply('🔧 Maintenance mode is now ON. Regular users will see a maintenance notice instead of receiving files. Admins are unaffected.');
      return;
    }

    if (arg === 'off') {
      await setMaintenanceMode(false);
      await ctx.reply('✅ Maintenance mode is now OFF. The bot is delivering files normally again.');
      return;
    }

    const current = await isMaintenanceMode();
    await ctx.reply(
      `🔧 Maintenance mode is currently ${current ? 'ON' : 'OFF'}.\n\nUsage: /maintenance on | /maintenance off`
    );
  });
}

module.exports = { registerMaintenanceCommand };
