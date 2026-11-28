import User from '../models/User.js';
import { getAuthorizedClient } from './tokenService.js';
import { GmailService } from './gmailService.js';

/**
 * Classifies Gmail API / OAuth errors into permanent auth failures vs temporary retryable failures.
 */
export function isPermanentAuthFailure(err) {
  if (!err) return false;
  const code = err.code || err.status || err.response?.status;
  const msg = String(err.message || '').toLowerCase();

  if (
    code === 'GOOGLE_TOKEN_EXPIRED' ||
    code === 401 ||
    msg.includes('invalid_grant') ||
    msg.includes('token has been expired or revoked') ||
    msg.includes('could not be decrypted') ||
    msg.includes('no oauth tokens available') ||
    msg.includes('user account not found') ||
    msg.includes('disconnected')
  ) {
    return true;
  }

  if (code === 403 && (msg.includes('insufficient') || msg.includes('scope') || msg.includes('access_denied'))) {
    return true;
  }

  return false;
}

/**
 * Determines whether an error should be retried safely later.
 */
export function isRetryableGmailError(err) {
  if (!err || isPermanentAuthFailure(err)) return false;
  const code = err.code || err.status || err.response?.status;
  const msg = String(err.message || '').toLowerCase();

  if ([408, 429, 500, 502, 503, 504].includes(Number(code))) return true;
  if (
    msg.includes('etimedout') ||
    msg.includes('econnreset') ||
    msg.includes('enotfound') ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('backend error') ||
    msg.includes('timeout')
  ) {
    return true;
  }

  // Default to retryable unless it's clearly a 400 validation error
  if (Number(code) >= 400 && Number(code) < 500) return false;
  return true;
}

/**
 * Sends a scheduled email document using the owning user's stored Gmail OAuth credentials.
 */
export async function deliverScheduledEmail(scheduledDoc) {
  if (!scheduledDoc || !scheduledDoc.userId) {
    const err = new Error('Scheduled email record is missing owner userId.');
    err.status = 400;
    throw err;
  }

  if (scheduledDoc.status === 'Cancelled') {
    const err = new Error('Scheduled email was cancelled and cannot be sent.');
    err.status = 409;
    throw err;
  }

  if (scheduledDoc.gmailMessageId || scheduledDoc.status === 'Sent') {
    return { alreadySent: true, id: scheduledDoc.gmailMessageId };
  }

  const user = await User.findById(scheduledDoc.userId);
  if (!user || !user.isConnected) {
    const authErr = new Error('User Gmail account not found or disconnected. Please sign in again.');
    authErr.status = 401;
    authErr.code = 'GOOGLE_TOKEN_EXPIRED';
    throw authErr;
  }

  const auth = await getAuthorizedClient(user);
  const result = await GmailService.sendMessage(auth, {
    from: user.email,
    to: scheduledDoc.recipient,
    cc: scheduledDoc.cc || undefined,
    bcc: scheduledDoc.bcc || undefined,
    subject: scheduledDoc.subject || '(No Subject)',
    body: scheduledDoc.body || '',
    isHtml: true
  });

  if (scheduledDoc.gmailDraftId) {
    await GmailService.deleteDraft(auth, scheduledDoc.gmailDraftId).catch(() => {});
  }

  return result;
}
