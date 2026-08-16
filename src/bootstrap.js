const Admin = require('./models/Admin');
const config = require('./config');
const logger = require('./utils/logger');

/**
 * Ensures the owner and any seed admins (from ADMIN_IDS) exist in MongoDB.
 * Runs on every boot but is idempotent - existing admins are left untouched.
 */
async function bootstrapAdmins() {
  const ownerExists = await Admin.findOne({ userId: config.ownerId });
  if (!ownerExists) {
    await Admin.create({ userId: config.ownerId, isOwner: true, addedBy: null });
    logger.info(`Seeded owner admin: ${config.ownerId}`);
  } else if (!ownerExists.isOwner) {
    ownerExists.isOwner = true;
    await ownerExists.save();
  }

  for (const id of config.seedAdminIds) {
    if (id === config.ownerId) continue;
    // eslint-disable-next-line no-await-in-loop
    const exists = await Admin.findOne({ userId: id });
    if (!exists) {
      // eslint-disable-next-line no-await-in-loop
      await Admin.create({ userId: id, isOwner: false, addedBy: config.ownerId });
      logger.info(`Seeded admin: ${id}`);
    }
  }
}

module.exports = { bootstrapAdmins };
