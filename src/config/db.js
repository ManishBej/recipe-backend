const mongoose = require('mongoose');

let isConnected = false;
let connectionPromise = null;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  // If a connection attempt is already in progress, wait for it
  if (connectionPromise) {
    await connectionPromise;
    return;
  }

  try {
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: true,
      maxPoolSize: 5, // Reduced for serverless
      serverSelectionTimeoutMS: 5000, // Reduced timeout
      socketTimeoutMS: 30000,
      // Removed deprecated options:
      // keepAlive: true,
      // keepAliveInitialDelay: 300000
    };

    connectionPromise = mongoose.connect(process.env.MONGODB_URI, opts);
    await connectionPromise;
    isConnected = true;
    connectionPromise = null;

    console.log('MongoDB Connected');

    // Handle connection errors
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      isConnected = false;
    });

  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    isConnected = false;
    connectionPromise = null;
    throw error;
  }
};

module.exports = connectDB;