import ScheduledEmail from '../models/ScheduledEmail.js';
import { isDbConnected } from '../config/db.js';
import { logger } from '../utils/logger.js';
import {
  deliverScheduledEmail,
  isPermanentAuthFailure,
  isRetryableGmailError
} from './gmailSchedulingService.js';

const LOCK_TTL_MS = 5 * 60 * 1000; // Recover abandoned Processing locks after 5 minutes
const RETRY_DELAYS_MINUTES = [2, 10, 30];

let activeBatchPromise = null;
let intervalHandle = null;

function computeNextRetryAt(nextRetryCount) {
  const idx = Math.min(Math.max(nextRetryCount - 1, 0), RETRY_DELAYS_MINUTES.length - 1);
  return new Date(Date.now() + RETRY_DELAYS_MINUTES[idx] * 60 * 1000);
}

/**
 * Recovers rows stuck in 'Processing' if a previous worker crashed/slept before finishing.
 * Never unlocks rows that already recorded a gmailMessageId (idempotency guard).
 */
async function recoverStaleLocks(now = new Date()) {
  const staleCutoff = new Date(now.getTime() - LOCK_TTL_MS);

  await ScheduledEmail.updateMany(
    {
      status: 'Processing',
      gmailMessageId: null,
      lockedAt: { $lte: staleCutoff }
    },
    {
      $set: {
        status: 'Scheduled',
        lockedAt: null,
        lockedBy: null,
        errorDetails: 'Recovered from interrupted worker lock; retrying safely.'
      }
    }
  );
}

/**
 * Atomically claims and processes up to `limit` due scheduled emails.
 * Prevents duplicate sending across overlapping requests or workers.
 */
export async function processDueScheduledEmails({
  limit = 20,
  userId = null,
  workerId = `worker-${process.pid}`
} = {}) {
  if (!isDbConnected()) {
    return { skipped: true, reason: 'database_disconnected', processed: 0, sent: 0, retried: 0, failed: 0 };
  }

  if (activeBatchPromise) {
    return await activeBatchPromise;
  }

  activeBatchPromise = (async () => {
    const summary = {
      processed: 0,
      sent: 0,
      retried: 0,
      failed: 0,
      details: []
    };

    try {
      const now = new Date();
      await recoverStaleLocks(now);

      for (let i = 0; i < limit; i += 1) {
        const claimFilter = {
          status: 'Scheduled',
          gmailMessageId: null,
          scheduledAt: { $lte: now },
          $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }]
        };

        if (userId) {
          claimFilter.userId = userId;
        }

        const claimed = await ScheduledEmail.findOneAndUpdate(
          claimFilter,
          {
            $set: {
              status: 'Processing',
              lockedAt: new Date(),
              lockedBy: workerId
            }
          },
          {
            sort: { scheduledAt: 1 },
            new: true
          }
        );

        if (!claimed) {
          break;
        }

        summary.processed += 1;

        try {
          const sendResult = await deliverScheduledEmail(claimed);
          const sentMessageId = sendResult?.id || `sent-${claimed._id}`;

          await ScheduledEmail.findByIdAndUpdate(claimed._id, {
            $set: {
              status: 'Sent',
              gmailMessageId: sentMessageId,
              sentAt: new Date(),
              lockedAt: null,
              lockedBy: null,
              errorDetails: null
            }
          });

          summary.sent += 1;
          summary.details.push({ id: String(claimed._id), status: 'Sent' });
          logger.success(`Scheduled email ${claimed._id} delivered via Gmail API.`);
        } catch (err) {
          const nextRetryCount = (claimed.retryCount || 0) + 1;
          const permanentAuth = isPermanentAuthFailure(err);
          const canRetry = !permanentAuth && isRetryableGmailError(err) && nextRetryCount < (claimed.maxRetries || 3);

          const cleanError = String(err.message || 'Unknown send failure').slice(0, 500);

          if (canRetry) {
            await ScheduledEmail.findByIdAndUpdate(claimed._id, {
              $set: {
                status: 'Scheduled',
                retryCount: nextRetryCount,
                nextRetryAt: computeNextRetryAt(nextRetryCount),
                lockedAt: null,
                lockedBy: null,
                errorDetails: `Retry ${nextRetryCount}/${claimed.maxRetries || 3}: ${cleanError}`
              }
            });
            summary.retried += 1;
            summary.details.push({ id: String(claimed._id), status: 'Scheduled', retry: nextRetryCount });
            logger.warn(`Scheduled email ${claimed._id} queued for retry (${nextRetryCount}): ${cleanError}`);
          } else {
            await ScheduledEmail.findByIdAndUpdate(claimed._id, {
              $set: {
                status: 'Failed',
                retryCount: nextRetryCount,
                lockedAt: null,
                lockedBy: null,
                errorDetails: permanentAuth
                  ? `Gmail authentication required: ${cleanError}`
                  : cleanError
              }
            });
            summary.failed += 1;
            summary.details.push({ id: String(claimed._id), status: 'Failed', error: cleanError });
            logger.error(`Scheduled email ${claimed._id} permanently failed: ${cleanError}`);
          }
        }
      }

      return summary;
    } finally {
      activeBatchPromise = null;
    }
  })();

  return await activeBatchPromise;
}

/**
 * Starts a non-blocking periodic check while the server is awake.
 * Note: Free hosting (Render Free) sleeps on inactivity, so GitHub Actions cron triggers
 * complement this timer by waking the server periodically.
 */
export function startInProcessScheduler({ intervalMs = 60000 } = {}) {
  if (process.env.ENABLE_IN_PROCESS_SCHEDULER === 'false' || process.env.NODE_ENV === 'test') {
    return null;
  }
  if (intervalHandle) {
    return intervalHandle;
  }

  intervalHandle = setInterval(() => {
    processDueScheduledEmails({ limit: 15, workerId: 'in-process-timer' }).catch((err) => {
      logger.error('In-process scheduler cycle error', err.message);
    });
  }, intervalMs);

  if (typeof intervalHandle.unref === 'function') {
    intervalHandle.unref();
  }

  return intervalHandle;
}

export function stopInProcessScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
