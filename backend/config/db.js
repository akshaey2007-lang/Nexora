import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

let isConnected = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    logger.warn('MONGODB_URI is not defined. Application will start in standalone/demo memory mode.');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: process.env.NODE_ENV !== 'production'
    });

    isConnected = true;
    logger.success(`MongoDB Connected: ${conn.connection.host} (${conn.connection.name})`);

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB connection lost. Reconnecting...');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      logger.success('MongoDB connection restored.');
    });

    return true;
  } catch (error) {
    isConnected = false;
    logger.warn(`Could not connect to MongoDB: ${error.message}`);
    logger.warn('The application will proceed with in-memory session/demo store until MongoDB is available.');
    return false;
  }
}

export function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export default connectDB;
