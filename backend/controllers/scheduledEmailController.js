import mongoose from 'mongoose';
import { GmailService } from '../services/gmailService.js';
import { getAuthorizedClient } from '../services/tokenService.js';
import { processDueScheduledEmails } from '../services/schedulerService.js';
import {
  cancelScheduledRecord,
  createScheduledRecord,
  deleteScheduledRecord,
  findAndUpdateScheduledRecord,
  getOwnerIdentity,
  listScheduledForUser
} from '../services/schedulerStore.js';
import {
  parseNaturalScheduleText,
  resolveScheduledTimestamp,
  sanitizeHeaderValue,
  validateRecipientList,
  formatScheduledDateTime
} from '../utils/scheduleTime.js';
import { logger } from '../utils/logger.js';

function stripDangerousTags(html = '') {
  return String(html || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

/**
 * Parses natural-language schedule text deterministically (no send action).
 */
export async function parseScheduleInstruction(req, res) {
  const { text, timezone = 'UTC', referenceDate } = req.body || {};

  const parsed = parseNaturalScheduleText(text, {
    timezone,
    referenceDate: referenceDate ? new Date(referenceDate) : new Date()
  });

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error
    });
  }

  const now = new Date();
  if (parsed.scheduledAt.getTime() <= now.getTime()) {
    return res.status(400).json({
      success: false,
      message: 'Interpreted date/time is already in the past. Please choose a future time.'
    });
  }

  return res.json({
    success: true,
    schedule: parsed
  });
}

/**
 * Lists scheduled emails belonging exclusively to the authenticated user.
 */
export async function listScheduledEmails(req, res, next) {
  try {
    const owner = getOwnerIdentity(req.user);
    if (!owner) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required for scheduling.'
      });
    }

    const { status } = req.query;
    const { items, summary, storageMode } = await listScheduledForUser(req.user, status);

    return res.json({
      success: true,
      scheduledEmails: items,
      summary,
      storageMode
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Creates a ScheduledEmail task after explicit user confirmation.
 */
export async function createScheduledEmail(req, res, next) {
  try {
    const owner = getOwnerIdentity(req.user);
    if (!owner) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user account is required to schedule emails.'
      });
    }

    const {
      to,
      recipient,
      cc,
      bcc,
      subject,
      body,
      scheduledAt,
      localDate,
      localTime,
      timezone = 'UTC',
      naturalLanguageInput = '',
      createGmailDraft = false
    } = req.body || {};

    const recipientCheck = validateRecipientList(recipient || to, { required: true });
    if (!recipientCheck.valid) {
      return res.status(400).json({ success: false, message: recipientCheck.message });
    }

    const ccCheck = validateRecipientList(cc, { required: false });
    if (!ccCheck.valid) {
      return res.status(400).json({ success: false, message: ccCheck.message });
    }

    const bccCheck = validateRecipientList(bcc, { required: false });
    if (!bccCheck.valid) {
      return res.status(400).json({ success: false, message: bccCheck.message });
    }

    const timeCheck = resolveScheduledTimestamp({
      scheduledAt,
      localDate,
      localTime,
      timezone,
      naturalLanguageInput
    });
    if (!timeCheck.valid) {
      return res.status(400).json({ success: false, message: timeCheck.message });
    }

    const cleanSubject = sanitizeHeaderValue(subject, '(No Subject)').slice(0, 500);
    const cleanBody = stripDangerousTags(body || '');

    let gmailDraftId = null;
    if (createGmailDraft) {
      try {
        const auth = await getAuthorizedClient(req.user);
        const draft = await GmailService.createDraft(auth, {
          from: req.user.email,
          to: recipientCheck.normalized,
          cc: ccCheck.normalized || undefined,
          bcc: bccCheck.normalized || undefined,
          subject: cleanSubject,
          body: cleanBody
        });
        gmailDraftId = draft?.id || null;
      } catch (draftErr) {
        logger.warn(`Optional Gmail draft sync failed for scheduled email: ${draftErr.message}`);
      }
    }

    const { record, storageMode } = await createScheduledRecord(req.user, {
      recipient: recipientCheck.normalized,
      cc: ccCheck.normalized,
      bcc: bccCheck.normalized,
      subject: cleanSubject,
      body: cleanBody,
      scheduledAt: timeCheck.scheduledAt,
      timezone: timeCheck.timezone,
      naturalLanguageInput: sanitizeHeaderValue(naturalLanguageInput).slice(0, 500),
      gmailDraftId
    });

    return res.status(201).json({
      success: true,
      message: `Scheduled for ${timeCheck.formatted.dateLabel} at ${timeCheck.formatted.timeLabel} (${timeCheck.timezone}).`,
      scheduledEmail: record,
      storageMode
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Edits or reschedules a pending or failed ScheduledEmail owned by the current user.
 */
export async function updateScheduledEmail(req, res, next) {
  try {
    const { id } = req.params;
    const {
      to,
      recipient,
      cc,
      bcc,
      subject,
      body,
      scheduledAt,
      localDate,
      localTime,
      timezone
    } = req.body || {};

    const result = await findAndUpdateScheduledRecord(req.user, id, async (existing) => {
      const recipientVal = recipient !== undefined ? recipient : to;
      if (recipientVal !== undefined) {
        const recipientCheck = validateRecipientList(recipientVal, { required: true });
        if (!recipientCheck.valid) return { error: recipientCheck.message, status: 400 };
        existing.recipient = recipientCheck.normalized;
      }

      if (cc !== undefined) {
        const ccCheck = validateRecipientList(cc, { required: false });
        if (!ccCheck.valid) return { error: ccCheck.message, status: 400 };
        existing.cc = ccCheck.normalized;
      }

      if (bcc !== undefined) {
        const bccCheck = validateRecipientList(bcc, { required: false });
        if (!bccCheck.valid) return { error: bccCheck.message, status: 400 };
        existing.bcc = bccCheck.normalized;
      }

      if (subject !== undefined) {
        existing.subject = sanitizeHeaderValue(subject, '(No Subject)').slice(0, 500);
      }

      if (body !== undefined) {
        existing.body = stripDangerousTags(body);
      }

      const tzToUse = timezone || existing.timezone || 'UTC';
      if (scheduledAt || (localDate && localTime)) {
        const timeCheck = resolveScheduledTimestamp({
          scheduledAt,
          localDate,
          localTime,
          timezone: tzToUse
        });
        if (!timeCheck.valid) return { error: timeCheck.message, status: 400 };
        existing.scheduledAt = timeCheck.scheduledAt;
        existing.timezone = timeCheck.timezone;
      } else if (timezone) {
        const tzCheck = resolveScheduledTimestamp({
          scheduledAt: existing.scheduledAt,
          timezone
        });
        if (!tzCheck.valid) return { error: tzCheck.message, status: 400 };
        existing.timezone = tzCheck.timezone;
      }

      existing.status = 'Scheduled';
      existing.retryCount = 0;
      existing.nextRetryAt = null;
      existing.errorDetails = null;
      existing.lockedAt = null;
      existing.lockedBy = null;
      return null;
    });

    if (result.error) {
      return res.status(result.status || 400).json({ success: false, message: result.error });
    }

    if (result.raw?.gmailDraftId) {
      try {
        const auth = await getAuthorizedClient(req.user);
        await GmailService.updateDraft(auth, result.raw.gmailDraftId, {
          from: req.user.email,
          to: result.raw.recipient,
          cc: result.raw.cc || undefined,
          bcc: result.raw.bcc || undefined,
          subject: result.raw.subject,
          body: result.raw.body
        });
      } catch {
        // Non-fatal draft sync
      }
    }

    const formatted = formatScheduledDateTime(result.record.scheduledAt, result.record.timezone);
    return res.json({
      success: true,
      message: `Updated for ${formatted.dateLabel} at ${formatted.timeLabel}.`,
      scheduledEmail: result.record,
      storageMode: result.storageMode
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Atomically cancels a pending/failed ScheduledEmail so it can never be sent.
 */
export async function cancelScheduledEmail(req, res, next) {
  try {
    const result = await cancelScheduledRecord(req.user, req.params.id);
    if (result.error) {
      return res.status(result.status || 400).json({ success: false, message: result.error });
    }

    return res.json({
      success: true,
      message: 'Scheduled email cancelled.',
      scheduledEmail: result.record,
      storageMode: result.storageMode
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Deletes a non-processing scheduled email entry.
 */
export async function deleteScheduledEmail(req, res, next) {
  try {
    const { id } = req.params;
    const result = await deleteScheduledRecord(req.user, id);
    if (result.error) {
      return res.status(result.status || 400).json({ success: false, message: result.error });
    }

    if (result.deleted?.gmailDraftId && result.deleted.status !== 'Sent') {
      try {
        const auth = await getAuthorizedClient(req.user);
        await GmailService.deleteDraft(auth, result.deleted.gmailDraftId);
      } catch {
        // Non-fatal cleanup
      }
    }

    return res.json({
      success: true,
      message: 'Deleted.',
      id
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Protected internal scheduler endpoint triggered by free GitHub Actions cron or internal monitor.
 */
export async function triggerSchedulerRun(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.body?.limit) || 25, 1), 100);
    const summary = await processDueScheduledEmails({
      limit,
      workerId: 'github-actions-cron'
    });

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Authenticated manual flush for the signed-in user's own due scheduled messages.
 */
export async function processUserDueScheduledEmails(req, res, next) {
  try {
    const owner = getOwnerIdentity(req.user);
    if (!owner) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const uid = req.user?._id && mongoose.Types.ObjectId.isValid(String(req.user._id))
      ? new mongoose.Types.ObjectId(String(req.user._id))
      : null;

    const summary = await processDueScheduledEmails({
      limit: 10,
      userId: uid,
      user: req.user,
      workerId: `user-${owner.ownerKey}`
    });

    return res.json({
      success: true,
      summary
    });
  } catch (error) {
    return next(error);
  }
}
