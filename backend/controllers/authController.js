import { getOAuth2Client, generateAuthUrl, generateStateToken } from '../config/google.js';
import { google } from 'googleapis';
import User from '../models/User.js';
import UserSettings from '../models/UserSettings.js';
import { encryptToken } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';
import { DEMO_USER } from '../middleware/authMiddleware.js';

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
        message: 'Google Client ID or Client Secret has not been set yet. Please paste your real credentials into your .env file (or Render dashboard), or click "Explore Interactive Demo" in the meantime.'
      });
    }

    const stateToken = generateStateToken();
    req.session.oauthState = stateToken;

    const url = generateAuthUrl(stateToken);
    res.json({
      success: true,
      url,
      state: stateToken
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
  const frontendUrl = process.env.FRONTEND_URL || '';

  if (oauthError) {
    logger.warn('OAuth consent error from Google:', oauthError);
    return res.redirect(`${frontendUrl}/auth/error?error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/auth/error?error=missing_code`);
  }

  // Verify CSRF state token
  if (!state || !req.session.oauthState || state !== req.session.oauthState) {
    logger.warn('OAuth state mismatch / possible CSRF');
    // In development allow continuation if session was lost during redirect
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

    let user;
    try {
      user = await User.findOne({ googleId });
      const encryptedRefresh = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;

      if (!user) {
        user = await User.create({
          googleId,
          email,
          displayName: displayName || email.split('@')[0],
          avatarUrl: avatarUrl || '',
          encryptedRefreshToken: encryptedRefresh,
          isConnected: true,
          lastLoginAt: new Date()
        });

        // Initialize default user settings
        await UserSettings.create({
          userId: user._id
        });
        logger.success(`Created new user account for ${email}`);
      } else {
        user.displayName = displayName || user.displayName;
        user.avatarUrl = avatarUrl || user.avatarUrl;
        user.isConnected = true;
        user.lastLoginAt = new Date();
        if (encryptedRefresh) {
          user.encryptedRefreshToken = encryptedRefresh;
        }
        await user.save();
        logger.success(`Updated existing user session for ${email}`);
      }

      req.session.userId = user._id.toString();
      req.session.isDemo = false;
      delete req.session.oauthState;

      // Save session explicitly before redirect
      req.session.save((err) => {
        if (err) {
          logger.error('Session save error on OAuth callback', err.message);
        }
        res.redirect(`${frontendUrl}/dashboard`);
      });
    } catch (dbError) {
      logger.error('Database error storing user in OAuth callback', dbError.message);
      // If MongoDB is offline, store user in session directly
      req.session.tempUser = {
        googleId,
        email,
        displayName: displayName || email.split('@')[0],
        avatarUrl
      };
      req.session.isDemo = false;
      res.redirect(`${frontendUrl}/dashboard`);
    }
  } catch (error) {
    logger.error('Google OAuth callback failed', error.message);
    res.redirect(`${frontendUrl}/auth/error?error=${encodeURIComponent(error.message)}`);
  }
}

export async function getCurrentUser(req, res) {
  try {
    if (req.isDemo) {
      return res.json({
        success: true,
        user: DEMO_USER,
        settings: {
          theme: 'light',
          sidebarCollapsed: false,
          notificationsEnabled: true,
          emailsPerPage: 25,
          signature: '--\nSent with NEXORA MAIL'
        },
        isDemo: true,
        hasLiveCredentials: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      });
    }

    let settings = null;
    try {
      settings = await UserSettings.findOne({ userId: req.user._id });
    } catch (e) {
      // Fallback
    }

    res.json({
      success: true,
      user: req.user.toSafeObject ? req.user.toSafeObject() : req.user,
      settings: settings || {
        theme: 'light',
        sidebarCollapsed: false,
        notificationsEnabled: true,
        emailsPerPage: 25,
        signature: '--\nSent with NEXORA MAIL'
      },
      isDemo: false,
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
    if (req.isDemo) {
      return res.json({
        success: true,
        message: 'Demo session disconnected'
      });
    }

    if (req.user && req.user._id) {
      await User.findByIdAndUpdate(req.user._id, {
        encryptedRefreshToken: null,
        isConnected: false
      });
    }

    req.session.destroy();
    res.clearCookie('nexora.sid');
    res.json({
      success: true,
      message: 'Google account disconnected successfully.'
    });
  } catch (error) {
    logger.error('Disconnect error', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect account'
    });
  }
}

export function enableDemoMode(req, res) {
  req.session.isDemo = true;
  req.session.save(() => {
    res.json({
      success: true,
      user: DEMO_USER,
      isDemo: true,
      message: 'Demo mode activated. Displaying simulated mailbox.'
    });
  });
}
