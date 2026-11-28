import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import { requireAuth } from '../middleware/authMiddleware.js';
import { verifySchedulerSecret } from '../middleware/schedulerAuth.js';
import { sanitizeHeaderValue, validateRecipientList } from '../utils/scheduleTime.js';
import { encryptToken, decryptToken } from '../utils/encryption.js';
import ScheduledEmail from '../models/ScheduledEmail.js';

function mockRes() {
  const res = {
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
  return res;
}

test('Unauthenticated requests are rejected cleanly with 401 by requireAuth', async () => {
  const res = mockRes();
  let nextCalled = false;

  await requireAuth({ session: null }, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.code, 'UNAUTHORIZED');
});

test('Internal scheduler webhook fails closed when secret is unset, missing, or mismatched', () => {
  const prevSecret = process.env.SCHEDULER_SECRET;

  try {
    delete process.env.SCHEDULER_SECRET;
    const resUnset = mockRes();
    let next1 = false;
    verifySchedulerSecret({ headers: {} }, resUnset, () => {
      next1 = true;
    });
    assert.equal(next1, false);
    assert.equal(resUnset.statusCode, 503);

    process.env.SCHEDULER_SECRET = 'super_strong_test_scheduler_secret_12345';

    const resMissing = mockRes();
    let next2 = false;
    verifySchedulerSecret({ headers: {} }, resMissing, () => {
      next2 = true;
    });
    assert.equal(next2, false);
    assert.equal(resMissing.statusCode, 401);

    const resWrong = mockRes();
    let next3 = false;
    verifySchedulerSecret({ headers: { 'x-scheduler-secret': 'wrong_secret' } }, resWrong, () => {
      next3 = true;
    });
    assert.equal(next3, false);
    assert.equal(resWrong.statusCode, 403);

    const resValid = mockRes();
    let next4 = false;
    verifySchedulerSecret(
      { headers: { authorization: 'Bearer super_strong_test_scheduler_secret_12345' } },
      resValid,
      () => {
        next4 = true;
      }
    );
    assert.equal(next4, true);
  } finally {
    if (prevSecret === undefined) delete process.env.SCHEDULER_SECRET;
    else process.env.SCHEDULER_SECRET = prevSecret;
  }
});

test('AES-256-GCM token encryption never leaves credentials plaintext and roundtrips cleanly', () => {
  const secretToken = '1//0g_test_google_refresh_token_secret';
  const encrypted = encryptToken(secretToken);

  assert.ok(encrypted);
  assert.ok(!encrypted.includes(secretToken));
  assert.equal(encrypted.split(':').length, 3);
  assert.equal(decryptToken(encrypted), secretToken);
  assert.throws(() => decryptToken('tampered:cipher:payload'));
});

test('ScheduledEmail safe serializer hides internal locks/keys and enforces userId schema requirement', () => {
  const doc = new ScheduledEmail({
    userId: new mongoose.Types.ObjectId(),
    recipient: 'target@example.com',
    subject: 'Update',
    body: '<p>Hello</p>',
    scheduledAt: new Date(Date.now() + 60000),
    timezone: 'UTC',
    lockedBy: 'worker-secret-host',
    idempotencyKey: 'internal-uuid'
  });

  const safe = doc.toSafeObject();
  assert.equal(safe.recipient, 'target@example.com');
  assert.equal(safe.lockedBy, undefined);
  assert.equal(safe.idempotencyKey, undefined);

  const missingOwner = new ScheduledEmail({
    recipient: 'target@example.com',
    scheduledAt: new Date(Date.now() + 60000)
  });
  const err = missingOwner.validateSync();
  assert.ok(err.errors.userId);
});

test('Input validation blocks malformed emails and newline header injection attempts', () => {
  const crlfRecipient = validateRecipientList('victim@example.com\nSubject: Hacked', { required: true });
  assert.equal(crlfRecipient.valid, false);

  const sanitizedSubject = sanitizeHeaderValue('Quarterly Update\r\nBcc: attacker@evil.com');
  assert.ok(!/[\r\n]/.test(sanitizedSubject));
});
