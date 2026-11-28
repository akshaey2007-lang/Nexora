import crypto from 'crypto';
import mongoose from 'mongoose';
import ScheduledEmail, { SCHEDULED_STATUSES } from '../models/ScheduledEmail.js';
import { isDbConnected } from '../config/db.js';

/**
 * In-memory fallback store used ONLY when MONGODB_URI is disconnected ("standalone/session").
 * Allows scheduling, editing, cancelling, deleting, and in-process dispatching while server is running.
 */
const memoryQueue = new Map();

export function getStorageMode(user) {
  const uid = user?._id ? String(user._id) : '';
  if (isDbConnected() && mongoose.Types.ObjectId.isValid(uid)) {
    return 'database';
  }
  return 'session';
}

export function getOwnerIdentity(user) {
  const uid = user?._id ? String(user._id) : '';
  if (isDbConnected() && mongoose.Types.ObjectId.isValid(uid)) {
    return {
      mode: 'database',
      userId: new mongoose.Types.ObjectId(uid),
      ownerKey: `db:${uid}`
    };
  }
  const fallbackKey = user?.googleId || user?.email;
  if (!fallbackKey) return null;
  return {
    mode: 'session',
    userId: null,
    ownerKey: `session:${String(fallbackKey).toLowerCase()}`
  };
}

function serializeMemoryDoc(doc) {
  return {
    id: doc.id,
    recipient: doc.recipient,
    cc: doc.cc,
    bcc: doc.bcc,
    subject: doc.subject,
    body: doc.body,
    scheduledAt: doc.scheduledAt,
    timezone: doc.timezone,
    naturalLanguageInput: doc.naturalLanguageInput,
    status: doc.status,
    gmailDraftId: doc.gmailDraftId,
    gmailMessageId: doc.gmailMessageId,
    retryCount: doc.retryCount,
    maxRetries: doc.maxRetries,
    nextRetryAt: doc.nextRetryAt,
    sentAt: doc.sentAt,
    errorDetails: doc.errorDetails,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

export async function listScheduledForUser(user, statusFilter = '') {
  const owner = getOwnerIdentity(user);
  if (!owner) return { items: [], summary: emptySummary(), storageMode: 'session' };

  if (owner.mode === 'database') {
    const filter = { userId: owner.userId };
    if (statusFilter && SCHEDULED_STATUSES.includes(statusFilter)) {
      filter.status = statusFilter;
    }

    const docs = await ScheduledEmail.find(filter)
      .sort({ scheduledAt: 1, createdAt: -1 })
      .limit(100);

    const summaryAgg = await ScheduledEmail.aggregate([
      { $match: { userId: owner.userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const summary = emptySummary();
    for (const row of summaryAgg) {
      if (row._id && summary[row._id] !== undefined) {
        summary[row._id] = row.count;
      }
    }

    return {
      items: docs.map((d) => d.toSafeObject()),
      summary,
      storageMode: 'database'
    };
  }

  // Standalone / session mode
  const allMine = Array.from(memoryQueue.values())
    .filter((d) => d.ownerKey === owner.ownerKey)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  const summary = emptySummary();
  for (const doc of allMine) {
    if (summary[doc.status] !== undefined) {
      summary[doc.status] += 1;
    }
  }

  const filtered =
    statusFilter && SCHEDULED_STATUSES.includes(statusFilter)
      ? allMine.filter((d) => d.status === statusFilter)
      : allMine;

  return {
    items: filtered.map(serializeMemoryDoc),
    summary,
    storageMode: 'session'
  };
}

export async function createScheduledRecord(user, payload) {
  const owner = getOwnerIdentity(user);
  if (!owner) {
    throw new Error('Authenticated user identity is required to schedule emails.');
  }

  if (owner.mode === 'database') {
    const created = await ScheduledEmail.create({
      userId: owner.userId,
      ...payload,
      status: 'Scheduled'
    });
    return { record: created.toSafeObject(), storageMode: 'database' };
  }

  const id = crypto.randomBytes(12).toString('hex');
  const now = new Date();
  const doc = {
    _id: id,
    id,
    ownerKey: owner.ownerKey,
    userId: owner.ownerKey,
    ...payload,
    status: 'Scheduled',
    gmailMessageId: null,
    idempotencyKey: crypto.randomUUID(),
    retryCount: 0,
    maxRetries: 3,
    nextRetryAt: null,
    lockedAt: null,
    lockedBy: null,
    sentAt: null,
    errorDetails: null,
    createdAt: now,
    updatedAt: now,
    // Internal-only credential snapshot for background send while Render is awake in standalone mode
    _authUserSnapshot: {
      email: user.email,
      isConnected: true,
      encryptedRefreshToken: user.encryptedRefreshToken || null,
      encryptedAccessToken: user.encryptedAccessToken || null,
      tokenExpiry: user.tokenExpiry || null
    }
  };
  memoryQueue.set(id, doc);
  return { record: serializeMemoryDoc(doc), storageMode: 'session' };
}

export async function findAndUpdateScheduledRecord(user, id, applyUpdates) {
  const owner = getOwnerIdentity(user);
  if (!owner) return { error: 'Unauthorized', status: 401 };

  if (owner.mode === 'database') {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { error: 'Invalid scheduled email ID.', status: 400 };
    }
    const existing = await ScheduledEmail.findOne({ _id: id, userId: owner.userId });
    if (!existing) return { error: 'Scheduled email not found.', status: 404 };
    if (['Processing', 'Sent', 'Cancelled'].includes(existing.status)) {
      return { error: `Cannot edit a scheduled email that is already ${existing.status}.`, status: 409 };
    }
    const result = await applyUpdates(existing);
    if (result?.error) return result;
    await existing.save();
    return { record: existing.toSafeObject(), raw: existing, storageMode: 'database' };
  }

  const existing = memoryQueue.get(id);
  if (!existing || existing.ownerKey !== owner.ownerKey) {
    return { error: 'Scheduled email not found.', status: 404 };
  }
  if (['Processing', 'Sent', 'Cancelled'].includes(existing.status)) {
    return { error: `Cannot edit a scheduled email that is already ${existing.status}.`, status: 409 };
  }
  const result = await applyUpdates(existing);
  if (result?.error) return result;
  existing.updatedAt = new Date();
  return { record: serializeMemoryDoc(existing), raw: existing, storageMode: 'session' };
}

export async function cancelScheduledRecord(user, id) {
  const owner = getOwnerIdentity(user);
  if (!owner) return { error: 'Unauthorized', status: 401 };

  if (owner.mode === 'database') {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { error: 'Invalid scheduled email ID.', status: 400 };
    }
    const updated = await ScheduledEmail.findOneAndUpdate(
      { _id: id, userId: owner.userId, status: { $in: ['Scheduled', 'Failed'] } },
      {
        $set: {
          status: 'Cancelled',
          nextRetryAt: null,
          lockedAt: null,
          lockedBy: null,
          errorDetails: 'Cancelled by user.'
        }
      },
      { new: true }
    );
    if (!updated) {
      const existing = await ScheduledEmail.findOne({ _id: id, userId: owner.userId });
      if (!existing) return { error: 'Scheduled email not found.', status: 404 };
      return { error: `Cannot cancel email with status "${existing.status}".`, status: 409 };
    }
    return { record: updated.toSafeObject(), storageMode: 'database' };
  }

  const doc = memoryQueue.get(id);
  if (!doc || doc.ownerKey !== owner.ownerKey) {
    return { error: 'Scheduled email not found.', status: 404 };
  }
  if (!['Scheduled', 'Failed'].includes(doc.status)) {
    return { error: `Cannot cancel email with status "${doc.status}".`, status: 409 };
  }
  doc.status = 'Cancelled';
  doc.nextRetryAt = null;
  doc.lockedAt = null;
  doc.lockedBy = null;
  doc.errorDetails = 'Cancelled by user.';
  doc.updatedAt = new Date();
  return { record: serializeMemoryDoc(doc), storageMode: 'session' };
}

export async function deleteScheduledRecord(user, id) {
  const owner = getOwnerIdentity(user);
  if (!owner) return { error: 'Unauthorized', status: 401 };

  if (owner.mode === 'database') {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { error: 'Invalid scheduled email ID.', status: 400 };
    }
    const deleted = await ScheduledEmail.findOneAndDelete({
      _id: id,
      userId: owner.userId,
      status: { $ne: 'Processing' }
    });
    if (!deleted) {
      const existing = await ScheduledEmail.findOne({ _id: id, userId: owner.userId });
      if (!existing) return { error: 'Scheduled email not found.', status: 404 };
      return { error: 'Cannot delete a message while it is being sent.', status: 409 };
    }
    return { deleted, storageMode: 'database' };
  }

  const doc = memoryQueue.get(id);
  if (!doc || doc.ownerKey !== owner.ownerKey) {
    return { error: 'Scheduled email not found.', status: 404 };
  }
  if (doc.status === 'Processing') {
    return { error: 'Cannot delete a message while it is being sent.', status: 409 };
  }
  memoryQueue.delete(id);
  return { deleted: doc, storageMode: 'session' };
}

export function getDueMemoryRecords({ ownerKey = null, now = new Date(), limit = 20 } = {}) {
  const results = [];
  for (const doc of memoryQueue.values()) {
    if (results.length >= limit) break;
    if (ownerKey && doc.ownerKey !== ownerKey) continue;
    if (doc.status !== 'Scheduled' || doc.gmailMessageId) continue;
    if (new Date(doc.scheduledAt).getTime() > now.getTime()) continue;
    if (doc.nextRetryAt && new Date(doc.nextRetryAt).getTime() > now.getTime()) continue;
    results.push(doc);
  }
  return results;
}

export function clearMemoryQueueForTests() {
  memoryQueue.clear();
}

function emptySummary() {
  return {
    Scheduled: 0,
    Processing: 0,
    Sent: 0,
    Failed: 0,
    Cancelled: 0
  };
}
