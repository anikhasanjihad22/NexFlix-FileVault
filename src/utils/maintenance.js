const Settings = require('../models/Settings');

const SETTINGS_KEY = 'maintenance_mode';

/** Returns true if maintenance mode is currently enabled. */
async function isMaintenanceMode() {
  try {
    const stored = await Settings.findOne({ key: SETTINGS_KEY });
    return Boolean(stored && stored.value === true);
  } catch (err) {
    // If we can't read the setting, fail open (don't block real users over a DB hiccup).
    return false;
  }
}

/** Enables or disables maintenance mode. */
async function setMaintenanceMode(enabled) {
  await Settings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: { value: Boolean(enabled) } },
    { upsert: true }
  );
}

module.exports = { isMaintenanceMode, setMaintenanceMode };
