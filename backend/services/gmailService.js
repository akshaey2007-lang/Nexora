import { google } from 'googleapis';
import { formatGmailMessage, buildRawMimeMessage, extractHeaders } from './mimeService.js';
import { logger } from '../utils/logger.js';

/**
 * Recursively checks whether a Gmail payload contains any file attachment parts
 */
function hasAttachmentParts(payload) {
  if (!payload) return false;
  if (payload.filename && payload.filename.length > 0 && payload.body?.attachmentId) {
    return true;
  }
  if (Array.isArray(payload.parts)) {
    return payload.parts.some((part) => hasAttachmentParts(part));
  }
  return false;
}

export class GmailService {
  /**
   * Initializes Gmail client with user OAuth2 credentials
   */
  static getClient(auth) {
    return google.gmail({ version: 'v1', auth });
  }

  /**
   * Retrieves user profile info (email address, total messages, threads)
   */
  static async getProfile(auth) {
    const gmail = this.getClient(auth);
    const res = await gmail.users.getProfile({ userId: 'me' });
    return res.data;
  }

  /**
   * Lists messages with metadata & attachment presence (avoids pulling message bodies)
   */
  static async listMessages(auth, { labelIds = ['INBOX'], q = '', maxResults = 25, pageToken = null } = {}) {
    const gmail = this.getClient(auth);

    const listParams = {
      userId: 'me',
      maxResults: Math.min(Math.max(maxResults, 1), 50),
      includeSpamTrash: labelIds.includes('TRASH') || labelIds.includes('SPAM')
    };

    if (labelIds && labelIds.length > 0) {
      listParams.labelIds = labelIds;
    }
    if (q && q.trim()) {
      listParams.q = q.trim();
    }
    if (pageToken) {
      listParams.pageToken = pageToken;
    }

    const listRes = await gmail.users.messages.list(listParams);
    const messageStubs = listRes.data.messages || [];

    if (messageStubs.length === 0) {
      return {
        messages: [],
        nextPageToken: null,
        resultSizeEstimate: 0
      };
    }

    // Retrieve headers and attachment part metadata without fetching message bodies
    const detailPromises = messageStubs.map(async (stub) => {
      try {
        const detailRes = await gmail.users.messages.get({
          userId: 'me',
          id: stub.id,
          format: 'full',
          fields:
            'id,threadId,labelIds,snippet,internalDate,payload(headers,mimeType,filename,body/attachmentId,parts(filename,mimeType,body/attachmentId,parts(filename,mimeType,body/attachmentId)))'
        });

        const headers = extractHeaders(detailRes.data.payload?.headers || []);
        const msgLabels = detailRes.data.labelIds || [];

        return {
          id: detailRes.data.id,
          threadId: detailRes.data.threadId,
          snippet: detailRes.data.snippet || '',
          internalDate: detailRes.data.internalDate || Date.now().toString(),
          date: headers.date || new Date(parseInt(detailRes.data.internalDate || Date.now(), 10)).toISOString(),
          from: headers.from,
          fromName: headers.fromName,
          fromEmail: headers.fromEmail,
          to: headers.to,
          cc: headers.cc,
          subject: headers.subject,
          labels: msgLabels,
          isUnread: msgLabels.includes('UNREAD'),
          isStarred: msgLabels.includes('STARRED'),
          isImportant: msgLabels.includes('IMPORTANT'),
          isDraft: msgLabels.includes('DRAFT'),
          isTrash: msgLabels.includes('TRASH'),
          isSpam: msgLabels.includes('SPAM'),
          isSent: msgLabels.includes('SENT'),
          hasAttachments: hasAttachmentParts(detailRes.data.payload)
        };
      } catch (err) {
        logger.warn(`Could not load metadata for message ${stub.id}: ${err.message}`);
        return null;
      }
    });

    const messages = (await Promise.all(detailPromises)).filter(Boolean);

    return {
      messages,
      nextPageToken: listRes.data.nextPageToken || null,
      resultSizeEstimate: listRes.data.resultSizeEstimate || messages.length
    };
  }

  /**
   * Batch modifies labels on multiple messages in a single Gmail API call
   */
  static async batchModifyMessages(auth, ids = [], { addLabelIds = [], removeLabelIds = [] } = {}) {
    if (!ids.length) return { modified: 0 };
    const gmail = this.getClient(auth);
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids,
        addLabelIds,
        removeLabelIds
      }
    });
    return { modified: ids.length };
  }

  /**
   * Retrieves full email message with parsed HTML body and attachments list
   */
  static async getMessage(auth, messageId) {
    const gmail = this.getClient(auth);
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    return formatGmailMessage(res.data);
  }

  /**
   * Modifies labels on a message (e.g., mark as read/unread, star/unstar, archive)
   */
  static async modifyMessage(auth, messageId, { addLabelIds = [], removeLabelIds = [] }) {
    const gmail = this.getClient(auth);
    const res = await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds,
        removeLabelIds
      }
    });
    return res.data;
  }

  /**
   * Moves a message to trash
   */
  static async trashMessage(auth, messageId) {
    const gmail = this.getClient(auth);
    const res = await gmail.users.messages.trash({
      userId: 'me',
      id: messageId
    });
    return res.data;
  }

  /**
   * Restores a message from trash
   */
  static async untrashMessage(auth, messageId) {
    const gmail = this.getClient(auth);
    const res = await gmail.users.messages.untrash({
      userId: 'me',
      id: messageId
    });
    return res.data;
  }

  /**
   * Sends an email via Gmail API
   */
  static async sendMessage(auth, messageData) {
    const gmail = this.getClient(auth);
    const raw = await buildRawMimeMessage(messageData);

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw,
        threadId: messageData.threadId || undefined
      }
    });

    return res.data;
  }

  /**
   * Creates a draft
   */
  static async createDraft(auth, draftData) {
    const gmail = this.getClient(auth);
    const raw = await buildRawMimeMessage(draftData);

    const res = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw,
          threadId: draftData.threadId || undefined
        }
      }
    });

    return res.data;
  }

  /**
   * Lists drafts
   */
  static async listDrafts(auth, { maxResults = 25, pageToken = null } = {}) {
    const gmail = this.getClient(auth);
    const res = await gmail.users.drafts.list({
      userId: 'me',
      maxResults,
      pageToken
    });

    const draftStubs = res.data.drafts || [];
    const drafts = await Promise.all(
      draftStubs.map(async (stub) => {
        try {
          const detail = await gmail.users.drafts.get({
            userId: 'me',
            id: stub.id,
            format: 'full',
            fields:
              'id,message(id,threadId,snippet,internalDate,labelIds,payload(headers,filename,body/attachmentId,parts(filename,body/attachmentId)))'
          });
          const message = detail.data.message;
          const headers = extractHeaders(message?.payload?.headers || []);
          return {
            id: detail.data.id,
            draftId: detail.data.id,
            messageId: message?.id,
            threadId: message?.threadId,
            snippet: message?.snippet || '',
            internalDate: message?.internalDate || Date.now().toString(),
            date: headers.date || new Date(parseInt(message?.internalDate || Date.now(), 10)).toISOString(),
            from: headers.from,
            fromName: headers.to ? `To: ${headers.to}` : 'Draft',
            to: headers.to,
            cc: headers.cc,
            subject: headers.subject || '(No Subject)',
            hasAttachments: hasAttachmentParts(message?.payload),
            isUnread: false,
            isDraft: true
          };
        } catch (err) {
          return null;
        }
      })
    );

    return {
      drafts: drafts.filter(Boolean),
      nextPageToken: res.data.nextPageToken || null
    };
  }

  /**
   * Gets a specific draft
   */
  static async getDraft(auth, draftId) {
    const gmail = this.getClient(auth);
    const res = await gmail.users.drafts.get({
      userId: 'me',
      id: draftId,
      format: 'full'
    });

    const formatted = formatGmailMessage(res.data.message);
    return {
      ...formatted,
      draftId: res.data.id
    };
  }

  /**
   * Updates an existing draft
   */
  static async updateDraft(auth, draftId, draftData) {
    const gmail = this.getClient(auth);
    const raw = await buildRawMimeMessage(draftData);

    const res = await gmail.users.drafts.update({
      userId: 'me',
      id: draftId,
      requestBody: {
        message: {
          raw,
          threadId: draftData.threadId || undefined
        }
      }
    });

    return res.data;
  }

  /**
   * Deletes a draft
   */
  static async deleteDraft(auth, draftId) {
    const gmail = this.getClient(auth);
    await gmail.users.drafts.delete({
      userId: 'me',
      id: draftId
    });
    return { success: true, id: draftId };
  }

  /**
   * Sends a draft directly
   */
  static async sendDraft(auth, draftId) {
    const gmail = this.getClient(auth);
    const res = await gmail.users.drafts.send({
      userId: 'me',
      requestBody: {
        id: draftId
      }
    });
    return res.data;
  }

  /**
   * Downloads an attachment
   */
  static async getAttachment(auth, messageId, attachmentId) {
    const gmail = this.getClient(auth);
    const res = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId
    });

    return {
      data: res.data.data, // base64url encoded
      size: res.data.size
    };
  }

  /**
   * Counts genuine unread/total messages across Gmail system labels and lists user custom labels
   */
  static async getUnreadCounts(auth) {
    const gmail = this.getClient(auth);
    const labelsRes = await gmail.users.labels.list({ userId: 'me' });
    const allLabels = labelsRes.data.labels || [];

    const systemLabelIds = ['INBOX', 'STARRED', 'IMPORTANT', 'SENT', 'DRAFT', 'SPAM', 'TRASH'];
    const labelDetails = await Promise.all(
      systemLabelIds.map(async (labelId) => {
        try {
          const detail = await gmail.users.labels.get({ userId: 'me', id: labelId });
          return detail.data;
        } catch {
          return null;
        }
      })
    );

    const counts = {
      inbox: 0,
      starred: 0,
      sent: 0,
      drafts: 0,
      spam: 0,
      trash: 0,
      important: 0
    };

    for (const label of labelDetails) {
      if (!label) continue;
      if (label.id === 'INBOX') counts.inbox = label.messagesUnread || 0;
      if (label.id === 'STARRED') counts.starred = label.messagesUnread || 0;
      if (label.id === 'DRAFT') counts.drafts = label.messagesTotal || 0;
      if (label.id === 'SPAM') counts.spam = label.messagesUnread || 0;
      if (label.id === 'TRASH') counts.trash = label.messagesTotal || 0;
      if (label.id === 'IMPORTANT') counts.important = label.messagesUnread || 0;
    }

    const customLabels = allLabels
      .filter((l) => l.type === 'user' && l.labelListVisibility !== 'labelHide')
      .map((l) => ({ id: l.id, name: l.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { counts, customLabels };
  }
}

export default GmailService;
