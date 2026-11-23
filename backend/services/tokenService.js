import { getOAuth2Client } from '../config/google.js';
import { decryptToken, encryptToken } from '../utils/encryption.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

/**
 * Returns an authorized OAuth2 client for a given user.
 * Automatically handles token refresh.
 */
export async function getAuthorizedClient(user) {
  if (!user) {
    throw new Error('User is required to obtain OAuth client');
  }

  if (!user.encryptedRefreshToken) {
    throw new Error('No refresh token available. User must reconnect Gmail account.');
  }

  const refreshToken = decryptToken(user.encryptedRefreshToken);
  const oauth2Client = getOAuth2Client();

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  // Listen for automatic token refreshes
  oauth2Client.on('tokens', async (tokens) => {
    try {
      if (tokens.refresh_token) {
        // In rare cases Google sends a new refresh token
        const newEncrypted = encryptToken(tokens.refresh_token);
        await User.findByIdAndUpdate(user._id, {
          encryptedRefreshToken: newEncrypted,
          isConnected: true
        });
        logger.info(`Updated refresh token for user ${user.email}`);
      }
    } catch (err) {
      logger.error('Failed to update refreshed tokens in database', err.message);
    }
  });

  return oauth2Client;
}
