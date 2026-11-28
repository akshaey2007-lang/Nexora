import mongoose from 'mongoose';
import ScheduledEmail, { SCHEDULED_STATUSES } from '../models/ScheduledEmail.js';
import { isDbConnected } from '../config/db.js';
import { GmailService } from '../services/gmailService.js';
import { getAuthorizedClient } from '../services/tokenService.js';
import { processDueScheduledEmails } from '../services/schedulerService.js';
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

function getAuthenticatedUserId(req) {
  const uid = req.user?._id ? String(req.user._id) : '';
  return mongoose.Types.ObjectId.isValid(uid) ? new mongoose.Types.ObjectId(uid) : null;
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
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB database must be connected to store and view scheduled emails.'
      });
    }

    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated MongoDB user profile is required for scheduling.'
      });
    }

    const { status } = req.query;
    const filter = { userId };
    if (status && SCHEDULED_STATUSES.includes(status)) {
      filter.status = status;
    }

    const items = await ScheduledEmail.find(filter)
      .sort({ scheduledAt: 1, createdAt: -1 })
      .limit(100);

    const summaryAgg = await ScheduledEmail.aggregate([
      { $match: { userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const summary = {
      Scheduled: 0,
      Processing: 0,
      Sent: 0,
      Failed: 0,
      Cancelled: 0
    };
    for (const row of summaryAgg) {
      if (row._id && summary[row._id] !== undefined) {
        summary[row._id] = row.count;
      }
    }

    return res.json({
      success: true,
      scheduledEmails: items.map((doc) => doc.toSafeObject()),
      summary
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Creates a persistent ScheduledEmail task after explicit user confirmation.
 */
export async function createScheduledEmail(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Scheduled sending requires a connected MongoDB Atlas database.'
      });
    }

    const userId = getAuthenticatedUserId(req);
    if (!userId) {
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

    const created = await ScheduledEmail.create({
      userId,
      recipient: recipientCheck.normalized,
      cc: ccCheck.normalized,
      bcc: bccCheck.normalized,
      subject: cleanSubject,
      body: cleanBody,
      scheduledAt: timeCheck.scheduledAt,
      timezone: timeCheck.timezone,
      naturalLanguageInput: sanitizeHeaderValue(naturalLanguageInput).slice(0, 500),
      status: 'Scheduled',
      gmailDraftId
    });

    return res.status(201).json({
      success: true,
      message: `Email scheduled for ${timeCheck.formatted.dateLabel} at ${timeCheck.formatted.timeLabel} (${timeCheck.timezone}).`,
      scheduledEmail: created.toSafeObject()
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
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database unavailable.' });
    }

    const userId = getAuthenticatedUserId(req);
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid scheduled email ID.' });
    }

    const existing = await ScheduledEmail.findOne({ _id: id, userId });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Scheduled email not found.' });
    }

    if (existing.status === 'Processing' || existing.status === 'Sent' || existing.status === 'Cancelled') {
      return res.status(409).json({
        success: false,
        message: `Cannot edit a scheduled email that is already ${existing.status}.`
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
      timezone
    } = req.body || {};

    const recipientVal = recipient !== undefined ? recipient : to;
    if (recipientVal !== undefined) {
      const recipientCheck = validateRecipientList(recipientVal, { required: true });
      if (!recipientCheck.valid) {
        return res.status(400).json({ success: false, message: recipientCheck.message });
      }
      existing.recipient = recipientCheck.normalized;
    }

    if (cc !== undefined) {
      const ccCheck = validateRecipientList(cc, { required: false });
      if (!ccCheck.valid) {
        return res.status(400).json({ success: false, message: ccCheck.message });
      }
      existing.cc = ccCheck.normalized;
    }

    if (bcc !== undefined) {
      const bccCheck = validateRecipientList(bcc, { required: false });
      if (!bccCheck.valid) {
        return res.status(400).json({ success: false, message: bccCheck.message });
      }
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
      if (!timeCheck.valid) {
        return res.status(400).json({ success: false, message: timeCheck.message });
      }
      existing.scheduledAt = timeCheck.scheduledAt;
      existing.timezone = timeCheck.timezone;
    } else if (timezone) {
      const tzCheck = resolveScheduledTimestamp({
        scheduledAt: existing.scheduledAt,
        timezone
      });
      if (!tzCheck.valid) {
        return res.status(400).json({ success: false, message: tzCheck.message });
      }
      existing.timezone = tzCheck.timezone;
    }

    // Re-arm failed items safely when edited/rescheduled
    existing.status = 'Scheduled';
    existing.retryCount = 0;
    existing.nextRetryAt = null;
    existing.errorDetails = null;
    existing.lockedAt = null;
    existing.lockedBy = null;

    await existing.save();

    if (existing.gmailDraftId) {
      try {
        const auth = await getAuthorizedClient(req.user);
        await GmailService.updateDraft(auth, existing.gmailDraftId, {
          from: req.user.email,
          to: existing.recipient,
          cc: existing.cc || undefined,
          bcc: existing.bcc || undefined,
          subject: existing.subject,
          body: existing.body
        });
      } catch {
        // Non-fatal draft sync update
      }
    }

    const formatted = formatScheduledDateTime(existing.scheduledAt, existing.timezone);

    return res.json({
      success: true,
      message: `Updated schedule for ${formatted.dateLabel} at ${formatted.timeLabel}.`,
      scheduledEmail: existing.toSafeObject()
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
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database unavailable.' });
    }

    const userId = getAuthenticatedUserId(req);
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid scheduled email ID.' });
    }

    const updated = await ScheduledEmail.findOneAndUpdate(
      {
        _id: id,
        userId,
        status: { $in: ['Scheduled', 'Failed'] }
      },
      {
        $set: {
          status: 'Cancelled',
          nextRetryAt: null,
          lockedAt: null,
          lockedBy: null,
          errorDetails: 'Cancelled by user before sending.'
        }
      },
      { new: true }
    );

    if (!updated) {
      const existing = await ScheduledEmail.findOne({ _id: id, userId });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Scheduled email not found.' });
      }
      return res.status(409).json({
        success: false,
        message: `Cannot cancel email with status "${existing.status}".`
      });
    }

    return res.json({
      success: true,
      message: 'Scheduled email cancelled and will not be sent.',
      scheduledEmail: updated.toSafeObject()
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Deletes a non-processing scheduled email entry (e.g., Cancelled, Sent, Failed, or Scheduled).
 */
export async function deleteScheduledEmail(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database unavailable.' });
    }

    const userId = getAuthenticatedUserId(req);
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid scheduled email ID.' });
    }

    const deleted = await ScheduledEmail.findOneAndDelete({
      _id: id,
      userId,
      status: { $ne: 'Processing' }
    });

    if (!deleted) {
      const existing = await ScheduledEmail.findOne({ _id: id, userId });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Scheduled email not found.' });
      }
      return res.status(409).json({
        success: false,
        message: 'Cannot delete a message while it is actively being processed.'
      });
    }

    if (deleted.gmailDraftId && deleted.status !== 'Sent') {
      try {
        const auth = await getAuthorizedClient(req.user);
        await GmailService.deleteDraft(auth, deleted.gmailDraftId);
      } catch {
        // Non-fatal cleanup
      }
    }

    return res.json({
      success: true,
      message: 'Scheduled entry deleted.',
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
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const summary = await processDueScheduledEmails({
      limit: 10,
      userId,
      workerId: `user-${userId}`
    });

    return res.json({
      success: true,
      summary
    });
  } catch (error) {
    return next(error);
  }
}
