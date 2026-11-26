import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { logger } from '../utils/logger.js';

/**
 * Converts buffer or string to URL-safe Base64 string required by Gmail API
 */
export function toBase64Url(bufferOrString) {
  const buf = Buffer.isBuffer(bufferOrString) 
    ? bufferOrString 
    : Buffer.from(bufferOrString, 'utf-8');
    
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes URL-safe Base64 string from Gmail API
 */
export function fromBase64Url(base64UrlStr) {
  if (!base64UrlStr) return '';
  let str = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf-8');
}

/**
 * Creates an RFC 2822 MIME email message using nodemailer's MailComposer
 * and encodes it to base64url for Gmail API.
 */
export async function buildRawMimeMessage({
  from,
  to,
  cc,
  bcc,
  subject,
  body,
  isHtml = true,
  attachments = [],
  inReplyTo,
  references
}) {
  const mailOptions = {
    from,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject: subject || '(No Subject)',
    headers: {}
  };

  if (cc) {
    mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
  }
  if (bcc) {
    mailOptions.bcc = Array.isArray(bcc) ? bcc.join(', ') : bcc;
  }
  if (inReplyTo) {
    mailOptions.inReplyTo = inReplyTo;
    mailOptions.headers['In-Reply-To'] = inReplyTo;
  }
  if (references) {
    mailOptions.references = references;
    mailOptions.headers['References'] = references;
  }

  if (isHtml) {
    const safeHtml = body || '';
    mailOptions.html = safeHtml;
    // Strip tags for plain text fallback
    mailOptions.text = safeHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  } else {
    mailOptions.text = body || '';
  }

  if (attachments && attachments.length > 0) {
    mailOptions.attachments = attachments.map(att => ({
      filename: att.originalname || att.filename || 'attachment',
      content: att.buffer || att.content,
      contentType: att.mimetype || att.contentType
    }));
  }

  const composer = new MailComposer(mailOptions);
  const compiled = await composer.compile().build();
  return toBase64Url(compiled);
}

/**
 * Parses headers array from Gmail API into an easy-to-use object
 */
export function extractHeaders(headers = []) {
  const result = {
    from: '',
    fromName: '',
    fromEmail: '',
    to: '',
    cc: '',
    bcc: '',
    subject: '(No Subject)',
    date: '',
    messageId: '',
    inReplyTo: '',
    references: ''
  };

  for (const header of headers) {
    const name = header.name.toLowerCase();
    const value = header.value || '';

    if (name === 'from') {
      result.from = value;
      const match = value.match(/(.*)<(.*)>/);
      if (match) {
        result.fromName = match[1].replace(/["']/g, '').trim();
        result.fromEmail = match[2].trim();
      } else {
        result.fromEmail = value.trim();
        result.fromName = value.split('@')[0];
      }
    } else if (name === 'to') {
      result.to = value;
    } else if (name === 'cc') {
      result.cc = value;
    } else if (name === 'bcc') {
      result.bcc = value;
    } else if (name === 'subject') {
      result.subject = value;
    } else if (name === 'date') {
      result.date = value;
    } else if (name === 'message-id') {
      result.messageId = value;
    } else if (name === 'in-reply-to') {
      result.inReplyTo = value;
    } else if (name === 'references') {
      result.references = value;
    }
  }

  return result;
}

/**
 * Recursively extracts plain text, HTML body, and attachment metadata from a Gmail payload
 */
export function parseBodyAndAttachments(payload) {
  let bodyHtml = '';
  let bodyText = '';
  const attachments = [];

  function traverse(part) {
    if (!part) return;

    const mimeType = part.mimeType || '';
    const filename = part.filename || '';
    const body = part.body || {};

    // Check if part is an attachment
    if (filename && filename.length > 0) {
      attachments.push({
        id: body.attachmentId || part.partId,
        filename,
        mimeType,
        size: body.size || 0
      });
      return;
    }

    // Direct content extraction
    if (body.data) {
      const decoded = fromBase64Url(body.data);
      if (mimeType === 'text/html') {
        bodyHtml = decoded;
      } else if (mimeType === 'text/plain' && !bodyHtml) {
        bodyText = decoded;
      }
    }

    // Recurse into child parts
    if (part.parts && Array.isArray(part.parts)) {
      for (const childPart of part.parts) {
        traverse(childPart);
      }
    }
  }

  traverse(payload);

  // If HTML body is absent, wrap plain text in simple HTML paragraphs
  if (!bodyHtml && bodyText) {
    bodyHtml = `<div style="white-space: pre-wrap; font-family: sans-serif;">${bodyText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</div>`;
  }

  return { bodyHtml, bodyText, attachments };
}

/**
 * Transforms full Gmail API Message object into clean frontend-friendly model
 */
export function formatGmailMessage(msg) {
  if (!msg) return null;

  const headers = extractHeaders(msg.payload?.headers || []);
  const { bodyHtml, bodyText, attachments } = parseBodyAndAttachments(msg.payload || {});

  const labelIds = msg.labelIds || [];
  const isUnread = labelIds.includes('UNREAD');
  const isStarred = labelIds.includes('STARRED');
  const isImportant = labelIds.includes('IMPORTANT');
  const isDraft = labelIds.includes('DRAFT');
  const isTrash = labelIds.includes('TRASH');
  const isSpam = labelIds.includes('SPAM');
  const isSent = labelIds.includes('SENT');

  return {
    id: msg.id,
    threadId: msg.threadId,
    snippet: msg.snippet || '',
    internalDate: msg.internalDate || Date.now().toString(),
    date: headers.date || new Date(parseInt(msg.internalDate || Date.now(), 10)).toISOString(),
    from: headers.from,
    fromName: headers.fromName || headers.from,
    fromEmail: headers.fromEmail,
    to: headers.to,
    cc: headers.cc,
    bcc: headers.bcc,
    subject: headers.subject,
    messageId: headers.messageId,
    inReplyTo: headers.inReplyTo,
    references: headers.references,
    bodyHtml,
    bodyText,
    attachments,
    hasAttachments: attachments.length > 0,
    labels: labelIds,
    isUnread,
    isStarred,
    isImportant,
    isDraft,
    isTrash,
    isSpam,
    isSent
  };
}
