import { google } from 'googleapis';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

// Minimal required scopes for Gmail full inbox management without excessive mail.google.com
export const GMAIL_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.modify'
];

/**
 * Creates and returns a Google OAuth2 client
 */
export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/auth/google/callback';

  if (!clientId || !clientSecret) {
    logger.warn('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Live Gmail API will be unavailable until configured.');
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
}

/**
 * Generates an authorization URL with a secure cryptographic state token
 */
export function generateAuthUrl(stateToken) {
  const oauth2Client = getOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Requests refresh token
    prompt: 'consent',     // Ensures refresh token is always returned
    scope: GMAIL_SCOPES,
    state: stateToken,
    include_granted_scopes: true
  });
}

/**
 * Generates a random cryptographic state string for CSRF protection
 */
export function generateStateToken() {
  return crypto.randomBytes(32).toString('hex');
}
