import mongoose from 'mongoose';
import { getOAuth2Client } from '../config/google.js';
import { decryptToken, encryptToken } from '../utils/encryption.js';
import { isDbConnected } from '../config/db.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

/**
 * Returns an authorized OAuth2 client for a given user.
 * Supports both refresh tokens and access tokens, and handles automatic refresh.
 */
export async function getAuthorizedClient(user) {
  if (!user) {
    throw new Error('User is required to obtain OAuth client');
  }

  let refreshToken = null;
  let accessToken = null;

  try {
    if (user.encryptedRefreshToken) {
      refreshToken = decryptToken(user.encryptedRefreshToken);
    }
    if (user.encryptedAccessToken) {
      accessToken = decryptToken(user.encryptedAccessToken);
    }
  } catch (err) {
    const authErr = new Error('Stored Google OAuth credentials could not be decrypted. Please sign in with Google again.');
    authErr.status = 401;
    authErr.code = 'GOOGLE_TOKEN_EXPIRED';
    throw authErr;
  }

  if (!refreshToken && !accessToken) {
    const authErr = new Error('No OAuth tokens available. User must reconnect Gmail account.');
    authErr.status = 401;
    authErr.code = 'GOOGLE_TOKEN_EXPIRED';
    throw authErr;
  }

  const oauth2Client = getOAuth2Client();
  const credentials = {};
  if (refreshToken) credentials.refresh_token = refreshToken;
  if (accessToken) credentials.access_token = accessToken;
  if (user.tokenExpiry) credentials.expiry_date = user.tokenExpiry;

  oauth2Client.setCredentials(credentials);

  // Listen for automatic token refreshes
  oauth2Client.on('tokens', async (tokens) => {
    try {
      const updates = { isConnected: true };
      if (tokens.refresh_token) {
        const encRefresh = encryptToken(tokens.refresh_token);
        updates.encryptedRefreshToken = encRefresh;
        user.encryptedRefreshToken = encRefresh;
      }
      if (tokens.access_token) {
        const encAccess = encryptToken(tokens.access_token);
        updates.encryptedAccessToken = encAccess;
        user.encryptedAccessToken = encAccess;
      }
      if (tokens.expiry_date) {
        updates.tokenExpiry = tokens.expiry_date;
        user.tokenExpiry = tokens.expiry_date;
      }

      if (isDbConnected() && user._id && mongoose.Types.ObjectId.isValid(user._id)) {
        await User.findByIdAndUpdate(user._id, updates);
        logger.info(`Updated OAuth tokens in database for user ${user.email}`);
      }
    } catch (err) {
      logger.error('Failed to update refreshed tokens in database', err.message);
    }
  });

  return oauth2Client;
}
