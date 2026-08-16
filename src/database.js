const mongoose = require('mongoose');
const config = require('./config');

async function connectDatabase() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    console.log('[DB] MongoDB connected.');
  });
  mongoose.connection.on('error', (err) => {
    console.error('[DB] MongoDB connection error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB disconnected.');
  });

  await mongoose.connect(config.mongodbUri, {
    serverSelectionTimeoutMS: 15000,
  });

  return mongoose.connection;
}

module.exports = { connectDatabase };
