import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error(`Error on ${req.method} ${req.url}:`, err.message);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Handle specific Google API Errors
  if (err.code === 401 || err.status === 401 || (err.message && err.message.includes('invalid_grant'))) {
    return res.status(401).json({
      success: false,
      message: 'Google OAuth session has expired or been revoked. Please reconnect your account.',
      code: 'GOOGLE_TOKEN_EXPIRED'
    });
  }

  if (err.code === 403 || err.status === 403) {
    return res.status(403).json({
      success: false,
      message: 'Permission denied by Gmail API. Check OAuth scopes and permissions.',
      code: 'FORBIDDEN'
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected server error occurred.';

  res.status(statusCode).json({
    success: false,
    message,
    code: err.code || 'SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}
