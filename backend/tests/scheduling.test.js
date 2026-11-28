import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import {
  formatScheduledDateTime,
  isValidTimezone,
  parseNaturalScheduleText,
  resolveScheduledTimestamp,
  sanitizeHeaderValue,
  validateRecipientList,
  zonedWallClockToUtc
} from '../utils/scheduleTime.js';
import {
  deliverScheduledEmail,
  isPermanentAuthFailure,
  isRetryableGmailError
} from '../services/gmailSchedulingService.js';
import { processDueScheduledEmails } from '../services/schedulerService.js';
import ScheduledEmail from '../models/ScheduledEmail.js';
import User from '../models/User.js';
import { GmailService } from '../services/gmailService.js';
import { encryptToken } from '../utils/encryption.js';
import {
  cancelScheduledEmail,
  createScheduledEmail,
  deleteScheduledEmail,
  listScheduledEmails,
  updateScheduledEmail
} from '../controllers/scheduledEmailController.js';

function createMockRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    }
  };
}

function withConnectedMockDb(fn) {
  return async () => {
    const origReadyState = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
    try {
      await fn();
    } finally {
      if (origReadyState) {
        Object.defineProperty(mongoose.connection, 'readyState', origReadyState);
      } else {
        delete mongoose.connection.readyState;
      }
    }
  };
}

test('Deterministic natural-language scheduling parses exact target timestamps', () => {
  const ref = new Date('2026-11-28T09:00:00.000Z'); // Saturday Nov 28, 2026

  const tomorrow = parseNaturalScheduleText('Send this email tomorrow at 9 AM', {
    timezone: 'UTC',
    referenceDate: ref
  });
  assert.equal(tomorrow.success, true);
  assert.equal(tomorrow.scheduledAtIso, '2026-11-29T09:00:00.000Z');

  const monday = parseNaturalScheduleText('Schedule this message for Monday at 4 PM', {
    timezone: 'UTC',
    referenceDate: ref
  });
  assert.equal(monday.success, true);
  assert.equal(monday.scheduledAtIso, '2026-11-30T16:00:00.000Z');

  const dec5 = parseNaturalScheduleText('Send this email on December 5 at 10:30 AM', {
    timezone: 'Asia/Kolkata',
    referenceDate: ref
  });
  assert.equal(dec5.success, true);
  assert.equal(dec5.scheduledAtIso, '2026-12-05T05:00:00.000Z');

  const nextFriday = parseNaturalScheduleText('Send a reminder email next Friday afternoon', {
    timezone: 'UTC',
    referenceDate: ref
  });
  assert.equal(nextFriday.success, true);
  assert.equal(nextFriday.scheduledAt.getUTCHours(), 15);
  assert.equal(nextFriday.scheduledAt.getUTCDay(), 5);
});

test('Timezone conversion and past-date validation reject bad or historical dates', () => {
  assert.equal(isValidTimezone('America/New_York'), true);
  assert.equal(isValidTimezone('Invalid/Zone'), false);

  const utcDate = zonedWallClockToUtc(
    { year: 2026, month: 7, day: 10, hour: 12, minute: 0 },
    'America/New_York'
  );
  assert.equal(utcDate.toISOString(), '2026-07-10T16:00:00.000Z');
  assert.match(formatScheduledDateTime(utcDate, 'America/New_York').timeLabel, /12:00/);

  const now = new Date('2026-11-28T12:00:00.000Z');
  const pastCheck = resolveScheduledTimestamp({
    scheduledAt: '2026-11-28T11:59:00.000Z',
    timezone: 'UTC',
    now
  });
  assert.equal(pastCheck.valid, false);
  assert.match(pastCheck.message, /future/i);

  const badTzCheck = resolveScheduledTimestamp({
    scheduledAt: '2026-12-01T10:00:00.000Z',
    timezone: 'Not/ATimezone',
    now
  });
  assert.equal(badTzCheck.valid, false);
});

test('Gmail error classification separates permanent OAuth errors from temporary retries', () => {
  assert.equal(isPermanentAuthFailure({ code: 'GOOGLE_TOKEN_EXPIRED', message: 'expired' }), true);
  assert.equal(isPermanentAuthFailure({ message: 'invalid_grant' }), true);
  assert.equal(isPermanentAuthFailure({ status: 401, message: 'Unauthorized' }), true);

  assert.equal(isRetryableGmailError({ status: 429, message: 'rate limit' }), true);
  assert.equal(isRetryableGmailError({ status: 503, message: 'Backend error' }), true);
  assert.equal(isRetryableGmailError({ status: 401, message: 'invalid_grant' }), false);
  assert.equal(isRetryableGmailError({ status: 400, message: 'Bad request' }), false);
});

test('Cancelled and already-sent records protect against duplicate/unwanted sending', async () => {
  const userId = new mongoose.Types.ObjectId();

  await assert.rejects(
    async () =>
      await deliverScheduledEmail({
        userId,
        recipient: 'a@b.com',
        status: 'Cancelled'
      }),
    /cancelled/i
  );

  const already = await deliverScheduledEmail({
    userId,
    recipient: 'a@b.com',
    status: 'Sent',
    gmailMessageId: 'msg-already-123'
  });
  assert.equal(already.alreadySent, true);
  assert.equal(already.id, 'msg-already-123');
});

test(
  'Controller lifecycle: create, list, edit/reschedule, cancel, delete, and cross-user isolation',
  withConnectedMockDb(async () => {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();
    const store = new Map();

    const origCreate = ScheduledEmail.create;
    const origFind = ScheduledEmail.find;
    const origAggregate = ScheduledEmail.aggregate;
    const origFindOne = ScheduledEmail.findOne;
    const origFindOneAndUpdate = ScheduledEmail.findOneAndUpdate;
    const origFindOneAndDelete = ScheduledEmail.findOneAndDelete;

    ScheduledEmail.create = async (data) => {
      const doc = new ScheduledEmail(data);
      doc.save = async () => {
        store.set(String(doc._id), doc);
        return doc;
      };
      store.set(String(doc._id), doc);
      return doc;
    };

    ScheduledEmail.find = (filter) => ({
      sort: () => ({
        limit: async () =>
          Array.from(store.values()).filter((d) => String(d.userId) === String(filter.userId))
      })
    });

    ScheduledEmail.aggregate = async () => [{ _id: 'Scheduled', count: store.size }];

    ScheduledEmail.findOne = async (filter) => {
      const doc = store.get(String(filter._id));
      if (!doc || String(doc.userId) !== String(filter.userId)) return null;
      return doc;
    };

    ScheduledEmail.findOneAndUpdate = async (filter, update) => {
      const doc = store.get(String(filter._id));
      if (!doc || String(doc.userId) !== String(filter.userId)) return null;
      if (filter.status?.$in && !filter.status.$in.includes(doc.status)) return null;
      Object.assign(doc, update.$set);
      return doc;
    };

    ScheduledEmail.findOneAndDelete = async (filter) => {
      const doc = store.get(String(filter._id));
      if (!doc || String(doc.userId) !== String(filter.userId)) return null;
      if (filter.status?.$ne && doc.status === filter.status.$ne) return null;
      store.delete(String(filter._id));
      return doc;
    };

    try {
      const pastRes = createMockRes();
      await createScheduledEmail(
        {
          user: { _id: userA, email: 'a@gmail.com' },
          body: {
            recipient: 'dest@example.com',
            subject: 'Old',
            body: '<p>Hi</p>',
            scheduledAt: '2020-01-01T10:00:00.000Z',
            timezone: 'UTC'
          }
        },
        pastRes,
        () => {}
      );
      assert.equal(pastRes.statusCode, 400);

      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

      const createRes = createMockRes();
      await createScheduledEmail(
        {
          user: { _id: userA, email: 'a@gmail.com' },
          body: {
            recipient: 'dest@example.com',
            subject: 'Future Note',
            body: '<p>Hello</p><script>alert(1)</script>',
            localDate: nextWeek,
            localTime: '09:30',
            timezone: 'Asia/Kolkata'
          }
        },
        createRes,
        () => {}
      );
      assert.equal(createRes.statusCode, 201);
      assert.equal(createRes.payload.scheduledEmail.status, 'Scheduled');
      assert.ok(!createRes.payload.scheduledEmail.body.includes('<script>'));
      const createdId = String(createRes.payload.scheduledEmail.id);

      const listRes = createMockRes();
      await listScheduledEmails({ user: { _id: userA }, query: {} }, listRes, () => {});
      assert.equal(listRes.payload.scheduledEmails.length, 1);

      const crossEditRes = createMockRes();
      await updateScheduledEmail(
        { user: { _id: userB }, params: { id: createdId }, body: { subject: 'Hijacked' } },
        crossEditRes,
        () => {}
      );
      assert.equal(crossEditRes.statusCode, 404);

      const crossCancelRes = createMockRes();
      await cancelScheduledEmail({ user: { _id: userB }, params: { id: createdId } }, crossCancelRes, () => {});
      assert.equal(crossCancelRes.statusCode, 404);

      const editRes = createMockRes();
      await updateScheduledEmail(
        {
          user: { _id: userA },
          params: { id: createdId },
          body: { subject: 'Updated Future Note', localDate: twoWeeks, localTime: '11:00', timezone: 'UTC' }
        },
        editRes,
        () => {}
      );
      assert.equal(editRes.statusCode, 200);
      assert.equal(editRes.payload.scheduledEmail.subject, 'Updated Future Note');

      const cancelRes = createMockRes();
      await cancelScheduledEmail({ user: { _id: userA }, params: { id: createdId } }, cancelRes, () => {});
      assert.equal(cancelRes.statusCode, 200);
      assert.equal(cancelRes.payload.scheduledEmail.status, 'Cancelled');

      const delRes = createMockRes();
      await deleteScheduledEmail({ user: { _id: userA }, params: { id: createdId } }, delRes, () => {});
      assert.equal(delRes.statusCode, 200);
      assert.equal(store.size, 0);
    } finally {
      ScheduledEmail.create = origCreate;
      ScheduledEmail.find = origFind;
      ScheduledEmail.aggregate = origAggregate;
      ScheduledEmail.findOne = origFindOne;
      ScheduledEmail.findOneAndUpdate = origFindOneAndUpdate;
      ScheduledEmail.findOneAndDelete = origFindOneAndDelete;
    }
  })
);

test(
  'Scheduler queue processor handles success, duplicate prevention, temporary retries, and OAuth failures',
  withConnectedMockDb(async () => {
    const prevKey = process.env.TOKEN_ENCRYPTION_KEY;
    const prevClientId = process.env.GOOGLE_CLIENT_ID;
    const prevSecret = process.env.GOOGLE_CLIENT_SECRET;
    process.env.TOKEN_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret';

    const userId = new mongoose.Types.ObjectId();
    const expiredUserId = new mongoose.Types.ObjectId();

    const okDoc = new ScheduledEmail({
      userId,
      recipient: 'ok@example.com',
      subject: 'Success Case',
      body: '<p>Hi</p>',
      scheduledAt: new Date(Date.now() - 60000),
      status: 'Scheduled'
    });
    const retryDoc = new ScheduledEmail({
      userId,
      recipient: 'retry@example.com',
      subject: 'Temporary 429',
      body: '<p>Hi</p>',
      scheduledAt: new Date(Date.now() - 50000),
      status: 'Scheduled'
    });
    const authFailDoc = new ScheduledEmail({
      userId: expiredUserId,
      recipient: 'fail@example.com',
      subject: 'No Token User',
      body: '<p>Hi</p>',
      scheduledAt: new Date(Date.now() - 40000),
      status: 'Scheduled'
    });

    const docs = [okDoc, retryDoc, authFailDoc];

    const origUpdateMany = ScheduledEmail.updateMany;
    const origFindOneAndUpdate = ScheduledEmail.findOneAndUpdate;
    const origFindByIdAndUpdate = ScheduledEmail.findByIdAndUpdate;
    const origUserFindById = User.findById;
    const origSendMessage = GmailService.sendMessage;

    let gmailSendCountForOk = 0;

    ScheduledEmail.updateMany = async () => ({ modifiedCount: 0 });
    ScheduledEmail.findOneAndUpdate = async (filter, update) => {
      const candidate = docs.find((d) => {
        if (d.status !== 'Scheduled' || d.gmailMessageId) return false;
        if (d.nextRetryAt && d.nextRetryAt.getTime() > Date.now()) return false;
        return d.scheduledAt.getTime() <= Date.now();
      });
      if (!candidate) return null;
      Object.assign(candidate, update.$set);
      return candidate;
    };

    ScheduledEmail.findByIdAndUpdate = async (id, update) => {
      const doc = docs.find((d) => String(d._id) === String(id));
      if (doc && update.$set) {
        Object.assign(doc, update.$set);
      }
      return doc;
    };

    User.findById = async (id) => {
      if (String(id) === String(expiredUserId)) {
        return { _id: expiredUserId, email: 'expired@gmail.com', isConnected: false };
      }
      return {
        _id: userId,
        email: 'sender@gmail.com',
        isConnected: true,
        encryptedRefreshToken: encryptToken('refresh-token-123')
      };
    };

    GmailService.sendMessage = async (_auth, payload) => {
      if (payload.to === 'ok@example.com') {
        gmailSendCountForOk += 1;
        return { id: 'gmail-msg-999' };
      }
      const err = new Error('Rate limit exceeded');
      err.status = 429;
      throw err;
    };

    try {
      const summary = await processDueScheduledEmails({ limit: 10 });
      assert.equal(summary.processed, 3);
      assert.equal(summary.sent, 1);
      assert.equal(summary.retried, 1);
      assert.equal(summary.failed, 1);

      assert.equal(okDoc.status, 'Sent');
      assert.equal(okDoc.gmailMessageId, 'gmail-msg-999');
      assert.equal(retryDoc.status, 'Scheduled');
      assert.equal(retryDoc.retryCount, 1);
      assert.ok(retryDoc.nextRetryAt instanceof Date);
      assert.equal(authFailDoc.status, 'Failed');
      assert.match(authFailDoc.errorDetails, /Gmail authentication required/i);

      const secondRun = await processDueScheduledEmails({ limit: 10 });
      assert.equal(secondRun.processed, 0);
      assert.equal(gmailSendCountForOk, 1);
    } finally {
      ScheduledEmail.updateMany = origUpdateMany;
      ScheduledEmail.findOneAndUpdate = origFindOneAndUpdate;
      ScheduledEmail.findByIdAndUpdate = origFindByIdAndUpdate;
      User.findById = origUserFindById;
      GmailService.sendMessage = origSendMessage;
      if (prevKey === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
      else process.env.TOKEN_ENCRYPTION_KEY = prevKey;
      if (prevClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = prevClientId;
      if (prevSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
      else process.env.GOOGLE_CLIENT_SECRET = prevSecret;
    }

    void sanitizeHeaderValue;
    void validateRecipientList;
  })
);
