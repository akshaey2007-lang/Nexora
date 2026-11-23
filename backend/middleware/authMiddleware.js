import User from '../models/User.js';
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
 * Middleware to require authenticated session (or demo session)
 */
export async function requireAuth(req, res, next) {
  try {
    // Check if session explicitly marked as Demo
    if (req.session && req.session.isDemo) {
      req.user = DEMO_USER;
      req.isDemo = true;
      return next();
    }

    if (!req.session || !req.session.userId) {
      // If DEMO_MODE_FALLBACK is true and no user is logged in, optionally check for demo query or header
      if (req.headers['x-demo-mode'] === 'true' || process.env.DEMO_MODE_FALLBACK === 'true') {
        // Fallback to demo mode if allowed
        req.user = DEMO_USER;
        req.isDemo = true;
        return next();
      }

      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in with Google.',
        code: 'UNAUTHORIZED'
      });
    }

    // Retrieve user from DB
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        req.session.destroy();
        return res.status(401).json({
          success: false,
          message: 'User session invalid. Please log in again.',
          code: 'USER_NOT_FOUND'
        });
      }

      req.user = user;
      req.isDemo = false;
      next();
    } catch (dbErr) {
      logger.error('DB error during user authentication', dbErr.message);
      // If DB is offline, fall back to demo mode if allowed
      if (process.env.DEMO_MODE_FALLBACK === 'true') {
        req.user = DEMO_USER;
        req.isDemo = true;
        return next();
      }
      return res.status(500).json({
        success: false,
        message: 'Database authentication service unavailable.'
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal authorization error'
    });
  }
}
