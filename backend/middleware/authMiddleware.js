import User from '../models/User.js';
import { isDbConnected } from '../config/db.js';
import { logger } from '../utils/logger.js';

export const DEMO_USER = {
  _id: 'demo_user_id_nexora',
  googleId: 'demo_google_123456789',
  email: 'alex.mercer@nexoramail.com',
  displayName: 'Alex Mercer',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces',
  isConnected: true,
  isDemo: true,
  createdAt: new Date().toISOString()
};

/**
 * Middleware to require authenticated session (Google OAuth user or explicitly activated Demo session)
 */
export async function requireAuth(req, res, next) {
  try {
    const demoAllowed = process.env.DEMO_MODE_FALLBACK === 'true';

    // 1. Check if user explicitly activated Demo Mode
    if (req.session && req.session.isDemo && demoAllowed) {
      req.user = DEMO_USER;
      req.isDemo = true;
      return next();
    }

    // 2. Allow explicit demo header only when demo mode is enabled
    if (req.headers['x-demo-mode'] === 'true' && demoAllowed) {
      req.user = DEMO_USER;
      req.isDemo = true;
      return next();
    }

    // 3. Check authenticated MongoDB user session
    if (req.session && req.session.userId && isDbConnected()) {
      try {
        const user = await User.findById(req.session.userId);
        if (user && user.isConnected) {
          req.user = user;
          req.isDemo = false;
          return next();
        }
      } catch (dbErr) {
        logger.error('DB error during user authentication', dbErr.message);
      }
    }

    // 4. Fallback to session-stored OAuth user (used when MongoDB is unavailable or temporarily disconnected)
    if (req.session && req.session.oauthSessionUser && req.session.oauthSessionUser.isConnected) {
      req.user = req.session.oauthSessionUser;
      req.isDemo = false;
      return next();
    }

    // 5. Reject unauthenticated requests cleanly (never silently force demo mode)
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in with Google.',
      code: 'UNAUTHORIZED'
    });
  } catch (error) {
    logger.error('Authentication middleware error', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal authorization error'
    });
  }
}
