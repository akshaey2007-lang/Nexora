import crypto from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * Constant-time bearer/header verification for internal cron/scheduler webhooks.
 */
export function verifySchedulerSecret(req, res, next) {
  const configuredSecret = (process.env.SCHEDULER_SECRET || '').trim();

  if (!configuredSecret) {
    logger.warn('Scheduler endpoint invoked without SCHEDULER_SECRET configured.');
    return res.status(503).json({
      success: false,
      message: 'Scheduler secret is not configured on this server.',
      code: 'SCHEDULER_NOT_CONFIGURED'
    });
  }

  const authHeader = String(req.headers.authorization || '');
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const providedSecret = String(req.headers['x-scheduler-secret'] || bearerToken || '').trim();

  if (!providedSecret) {
    return res.status(401).json({
      success: false,
      message: 'Missing scheduler authentication secret.',
      code: 'UNAUTHORIZED'
    });
  }

  const expectedBuf = Buffer.from(configuredSecret, 'utf8');
  const providedBuf = Buffer.from(providedSecret, 'utf8');

  if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    logger.warn('Rejected invalid scheduler secret attempt.');
    return res.status(403).json({
      success: false,
      message: 'Invalid scheduler authentication secret.',
      code: 'FORBIDDEN'
    });
  }

  return next();
}
