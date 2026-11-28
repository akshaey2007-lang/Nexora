import mongoose from 'mongoose';
import { getOAuth2Client, generateAuthUrl, generateStateToken } from '../config/google.js';
import { google } from 'googleapis';
import { isDbConnected } from '../config/db.js';
import User from '../models/User.js';
import UserSettings from '../models/UserSettings.js';
import { encryptToken } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';

/**
 * Resolves the safe frontend base URL for redirects after OAuth.
 * Prevents production deployments from accidentally redirecting to localhost.
 */
function resolveFrontendRedirectBase(req) {
  const isProd = process.env.NODE_ENV === 'production';
  const configured = (process.env.FRONTEND_URL || '').trim().replace(/\/$/, '');

  // If production monorepo, ignore accidental localhost FRONTEND_URL from .env.example
  if (isProd) {
    if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
      return configured;
    }
    return '';
  }

  // In development, honor caller origin or referer (e.g. http://localhost:5173) or FRONTEND_URL
  const originHeader = req.headers.origin;
  if (originHeader && (originHeader.startsWith('http://localhost') || originHeader.startsWith('http://127.0.0.1'))) {
    return originHeader.replace(/\/$/, '');
  }
  const refererHeader = req.headers.referer;
  if (refererHeader) {
    try {
      const refUrl = new URL(refererHeader);
      if (refUrl.hostname === 'localhost' || refUrl.hostname === '127.0.0.1') {
        return refUrl.origin;
      }
    } catch (_) {
      // Ignore malformed referer
    }
  }

  return configured || 'http://localhost:5173';
}

/**
 * Strips encrypted secrets before sending user object to frontend
 */
function toPublicUser(user) {
  if (!user) return null;
  if (typeof user.toSafeObject === 'function') {
    return user.toSafeObject();
  }
  return {
    id: user._id || user.googleId,
    googleId: user.googleId,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    isConnected: Boolean(user.isConnected),
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt
  };
}

export async function getPublicConfig(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const hasLiveCredentials = Boolean(
    clientId &&
    !clientId.includes('your_google_client_id') &&
    clientSecret &&
    !clientSecret.includes('your_google_client_secret')
  );

  res.json({
    success: true,
    hasLiveCredentials
  });
}

export async function getGoogleAuthUrl(req, res) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (
      !clientId ||
      clientId.includes('your_google_client_id') ||
      !clientSecret ||
      clientSecret.includes('your_google_client_secret')
    ) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_GOOGLE_CREDENTIALS',
        message: 'Google OAuth credentials are not configured on the server.'
      });
    }

    const stateToken = generateStateToken();
    req.session.oauthState = stateToken;
    req.session.returnOrigin = resolveFrontendRedirectBase(req);

    const forceConsent = req.query.reconsent === 'true';
    const url = generateAuthUrl(stateToken, { forceConsent });

    // Ensure session state is persisted to MongoStore/MemoryStore BEFORE browser redirects to Google
    req.session.save((err) => {
      if (err) {
        logger.error('Failed to persist session before OAuth redirect', err.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to initialize login session.'
        });
      }

      if (req.query.redirect === 'true') {
        return res.redirect(url);
      }

      res.json({
        success: true,
        url,
        state: stateToken
      });
    });
  } catch (error) {
    logger.error('Failed to generate Google Auth URL', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate Google sign-in. Check server credentials.'
    });
  }
}

export async function handleGoogleCallback(req, res) {
  const { code, state, error: oauthError } = req.query;
  const frontendUrl = req.session?.returnOrigin !== undefined
    ? req.session.returnOrigin
    : resolveFrontendRedirectBase(req);

  if (oauthError) {
    logger.warn('OAuth consent error from Google:', oauthError);
    return res.redirect(`${frontendUrl}/auth/error?error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/auth/error?error=missing_code`);
  }

  // Verify CSRF state token
  if (!state || !req.session?.oauthState || state !== req.session.oauthState) {
    logger.warn(
      `OAuth state mismatch: queryState=${Boolean(state)}, sessionState=${Boolean(req.session?.oauthState)}, match=${state === req.session?.oauthState}`
    );
    if (process.env.NODE_ENV === 'production') {
      return res.redirect(`${frontendUrl}/auth/error?error=invalid_state`);
    }
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user profile info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const { id: googleId, email, name: displayName, picture: avatarUrl } = userInfo.data;

    if (!googleId || !email) {
      throw new Error('Google returned incomplete user profile information');
    }

    const encryptedRefresh = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;
    const encryptedAccess = tokens.access_token ? encryptToken(tokens.access_token) : null;
    const tokenExpiry = tokens.expiry_date || null;

    // Store encrypted session backup so Gmail works even if MongoDB is temporarily offline
    const sessionUserObj = {
      googleId,
      email,
      displayName: displayName || email.split('@')[0],
      avatarUrl: avatarUrl || '',
      encryptedRefreshToken: encryptedRefresh,
      encryptedAccessToken: encryptedAccess,
      tokenExpiry,
      isConnected: true,
      lastLoginAt: new Date().toISOString()
    };

    if (isDbConnected()) {
      try {
        let user = await User.findOne({ googleId });

        if (!user) {
          user = await User.create({
            googleId,
            email,
            displayName: sessionUserObj.displayName,
            avatarUrl: sessionUserObj.avatarUrl,
            encryptedRefreshToken: encryptedRefresh,
            encryptedAccessToken: encryptedAccess,
            tokenExpiry,
            isConnected: true,
            lastLoginAt: new Date()
          });

          await UserSettings.create({ userId: user._id });
          logger.success(`Created new user account for ${email}`);
        } else {
          user.displayName = displayName || user.displayName;
          user.avatarUrl = avatarUrl || user.avatarUrl;
          user.isConnected = true;
          user.lastLoginAt = new Date();
          if (encryptedRefresh) {
            user.encryptedRefreshToken = encryptedRefresh;
          }
          if (encryptedAccess) {
            user.encryptedAccessToken = encryptedAccess;
          }
          if (tokenExpiry) {
            user.tokenExpiry = tokenExpiry;
          }
          await user.save();
          logger.success(`Updated existing user session for ${email}`);
        }

        req.session.userId = user._id.toString();
        // Preserve existing refresh token from DB in backup object if Google didn't send a new one
        if (!sessionUserObj.encryptedRefreshToken && user.encryptedRefreshToken) {
          sessionUserObj.encryptedRefreshToken = user.encryptedRefreshToken;
        }
        sessionUserObj._id = user._id.toString();
      } catch (dbError) {
        logger.error('Database error storing user in OAuth callback (continuing with session store):', dbError.message);
      }
    } else {
      logger.warn(`MongoDB disconnected; authenticating ${email} via encrypted session storage.`);
    }

    req.session.oauthSessionUser = sessionUserObj;
    delete req.session.oauthState;
    delete req.session.returnOrigin;

    // Save session explicitly before redirecting to dashboard
    req.session.save((err) => {
      if (err) {
        logger.error('Session save error on OAuth callback:', err.message);
        return res.redirect(`${frontendUrl}/auth/error?error=session_save_failed`);
      }
      logger.info(`Redirecting authenticated user ${email} to ${frontendUrl}/dashboard`);
      return res.redirect(`${frontendUrl}/dashboard`);
    });
  } catch (error) {
    logger.error('Google OAuth callback failed', error.message);
    res.redirect(`${frontendUrl}/auth/error?error=${encodeURIComponent(error.message)}`);
  }
}

export async function getCurrentUser(req, res) {
  try {
    let settings = null;
    if (isDbConnected() && req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      try {
        settings = await UserSettings.findOne({ userId: req.user._id });
      } catch (e) {
        // Fallback below
      }
    } else if (req.session?.tempSettings) {
      settings = req.session.tempSettings;
    }

    res.json({
      success: true,
      user: toPublicUser(req.user),
      settings: settings || {
        theme: 'light',
        sidebarCollapsed: false,
        notificationsEnabled: true,
        emailsPerPage: 25,
        signature: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        aiEnabled: true,
        aiModelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
      },
      hasLiveCredentials: true
    });
  } catch (error) {
    logger.error('Get current user error', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile'
    });
  }
}

export function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Logout error', err.message);
      return res.status(500).json({ success: false, message: 'Could not log out' });
    }
    res.clearCookie('nexora.sid');
    res.json({ success: true, message: 'Successfully logged out' });
  });
}

export async function disconnectGoogle(req, res) {
  try {
    if (isDbConnected() && req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      await User.findByIdAndUpdate(req.user._id, {
        encryptedRefreshToken: null,
        encryptedAccessToken: null,
        tokenExpiry: null,
        isConnected: false
      });
    }

    req.session.destroy(() => {
      res.clearCookie('nexora.sid');
      res.json({
        success: true,
        message: 'Google account disconnected successfully.'
      });
    });
  } catch (error) {
    logger.error('Disconnect error', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect account'
    });
  }
}
