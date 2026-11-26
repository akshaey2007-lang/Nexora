import User from '../models/User.js';
import { isDbConnected } from '../config/db.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to require an authenticated Google OAuth session
 */
export async function requireAuth(req, res, next) {
  try {
    // 1. Check authenticated MongoDB user session
    if (req.session && req.session.userId && isDbConnected()) {
      try {
        const user = await User.findById(req.session.userId);
        if (user && user.isConnected) {
          req.user = user;
          return next();
        }
      } catch (dbErr) {
        logger.error('DB error during user authentication', dbErr.message);
      }
    }

    // 2. Session-stored OAuth user (used when MongoDB is unavailable or temporarily disconnected)
    if (req.session && req.session.oauthSessionUser && req.session.oauthSessionUser.isConnected) {
      req.user = req.session.oauthSessionUser;
      return next();
    }

    // 3. Reject unauthenticated requests
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
