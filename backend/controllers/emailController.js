import path from 'path';
import { GmailService } from '../services/gmailService.js';
import { getAuthorizedClient } from '../services/tokenService.js';

async function getAuth(req) {
  return await getAuthorizedClient(req.user);
}

export async function getInbox(req, res, next) {
  try {
    const { pageToken, maxResults } = req.query;
    const auth = await getAuth(req);
    const data = await GmailService.listMessages(auth, {
      labelIds: ['INBOX'],
      pageToken,
      maxResults: parseInt(maxResults, 10) || 25
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getSent(req, res, next) {
  try {
    const { pageToken, maxResults } = req.query;
    const auth = await getAuth(req);
    const data = await GmailService.listMessages(auth, {
      labelIds: ['SENT'],
      pageToken,
      maxResults: parseInt(maxResults, 10) || 25
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getStarred(req, res, next) {
  try {
    const { pageToken, maxResults } = req.query;
    const auth = await getAuth(req);
    const data = await GmailService.listMessages(auth, {
      labelIds: ['STARRED'],
      pageToken,
      maxResults: parseInt(maxResults, 10) || 25
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getImportant(req, res, next) {
  try {
    const { pageToken, maxResults } = req.query;
    const auth = await getAuth(req);
    const data = await GmailService.listMessages(auth, {
      labelIds: ['IMPORTANT'],
      pageToken,
      maxResults: parseInt(maxResults, 10) || 25
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getArchive(req, res, next) {
  try {
    const { pageToken, maxResults } = req.query;
    const auth = await getAuth(req);
    const data = await GmailService.listMessages(auth, {
      labelIds: [],
      q: '-in:inbox -in:trash -in:spam -in:drafts',
      pageToken,
      maxResults: parseInt(maxResults, 10) || 25
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getByLabel(req, res, next) {
  try {
    const { labelId } = req.params;
    const { pageToken, maxResults } = req.query;
    const auth = await getAuth(req);
    const data = await GmailService.listMessages(auth, {
      labelIds: [labelId],
      pageToken,
      maxResults: parseInt(maxResults, 10) || 25
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getDrafts(req, res, next) {
  try {
    const { pageToken, maxResults } = req.query;
    const auth = await getAuth(req);
    const data = await GmailService.listDrafts(auth, {
      pageToken,
      maxResults: parseInt(maxResults, 10) || 25
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getDraftById(req, res, next) {
  try {
    const { id } = req.params;
    const auth = await getAuth(req);
    const draft = await GmailService.getDraft(auth, id);
    res.json({ success: true, draft });
  } catch (error) {
    next(error);
  }
}

export async function getSpam(req, res, next) {
  try {
    const { pageToken, maxResults } = req.query;
    const auth = await getAuth(req);
    const data = await GmailService.listMessages(auth, {
      labelIds: ['SPAM'],
      pageToken,
      maxResults: parseInt(maxResults, 10) || 25
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getTrash(req, res, next) {
  try {
    const { pageToken, maxResults } = req.query;
    const auth = await getAuth(req);
    const data = await GmailService.listMessages(auth, {
      labelIds: ['TRASH'],
      pageToken,
      maxResults: parseInt(maxResults, 10) || 25
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getEmailById(req, res, next) {
  try {
    const { id } = req.params;
    const auth = await getAuth(req);
    const email = await GmailService.getMessage(auth, id);
    res.json({ success: true, email });
  } catch (error) {
    next(error);
  }
}

export async function sendEmail(req, res, next) {
  try {
    const { to, cc, bcc, subject, body, inReplyTo, references, threadId, draftId } = req.body;
    const attachments = req.files || [];

    if (!to || !to.trim() || !to.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide at least one valid recipient email address.' });
    }

    const auth = await getAuth(req);
    const userEmail = req.user.email;

    const result = await GmailService.sendMessage(auth, {
      from: userEmail,
      to: to.trim(),
      cc: cc ? cc.trim() : undefined,
      bcc: bcc ? bcc.trim() : undefined,
      subject,
      body: body || '',
      isHtml: true,
      attachments,
      inReplyTo,
      references,
      threadId
    });

    // If sent from an open draft, remove the draft entry after successful delivery
    if (draftId) {
      await GmailService.deleteDraft(auth, draftId).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Email sent.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function createDraft(req, res, next) {
  try {
    const { to, cc, bcc, subject, body, threadId } = req.body;
    const attachments = req.files || [];
    const auth = await getAuth(req);

    const result = await GmailService.createDraft(auth, {
      from: req.user.email,
      to: to || '',
      cc,
      bcc,
      subject,
      body: body || '',
      attachments,
      threadId
    });

    res.json({ success: true, draft: result });
  } catch (error) {
    next(error);
  }
}

export async function updateDraft(req, res, next) {
  try {
    const { id } = req.params;
    const { to, cc, bcc, subject, body, threadId } = req.body;
    const attachments = req.files || [];
    const auth = await getAuth(req);

    const result = await GmailService.updateDraft(auth, id, {
      from: req.user.email,
      to: to || '',
      cc,
      bcc,
      subject,
      body: body || '',
      attachments,
      threadId
    });

    res.json({ success: true, draft: result });
  } catch (error) {
    next(error);
  }
}

export async function deleteDraft(req, res, next) {
  try {
    const { id } = req.params;
    const auth = await getAuth(req);
    await GmailService.deleteDraft(auth, id);
    res.json({ success: true, message: 'Draft deleted.' });
  } catch (error) {
    next(error);
  }
}

export async function sendDraft(req, res, next) {
  try {
    const { id } = req.params;
    const auth = await getAuth(req);
    const result = await GmailService.sendDraft(auth, id);
    res.json({ success: true, message: 'Draft sent.', data: result });
  } catch (error) {
    next(error);
  }
}

export async function markRead(req, res, next) {
  try {
    const { id } = req.params;
    const { isRead = true } = req.body;
    const auth = await getAuth(req);

    await GmailService.modifyMessage(auth, id, {
      addLabelIds: isRead ? [] : ['UNREAD'],
      removeLabelIds: isRead ? ['UNREAD'] : []
    });

    res.json({ success: true, id, isUnread: !isRead });
  } catch (error) {
    next(error);
  }
}

export async function toggleStar(req, res, next) {
  try {
    const { id } = req.params;
    const { isStarred } = req.body;
    const auth = await getAuth(req);

    await GmailService.modifyMessage(auth, id, {
      addLabelIds: isStarred ? ['STARRED'] : [],
      removeLabelIds: isStarred ? [] : ['STARRED']
    });

    res.json({ success: true, id, isStarred });
  } catch (error) {
    next(error);
  }
}

export async function archiveEmail(req, res, next) {
  try {
    const { id } = req.params;
    const auth = await getAuth(req);

    await GmailService.modifyMessage(auth, id, {
      removeLabelIds: ['INBOX']
    });

    res.json({ success: true, id, message: 'Archived.' });
  } catch (error) {
    next(error);
  }
}

export async function trashEmail(req, res, next) {
  try {
    const { id } = req.params;
    const auth = await getAuth(req);
    await GmailService.trashMessage(auth, id);
    res.json({ success: true, id, message: 'Moved to Trash.' });
  } catch (error) {
    next(error);
  }
}

export async function restoreEmail(req, res, next) {
  try {
    const { id } = req.params;
    const auth = await getAuth(req);
    await GmailService.untrashMessage(auth, id);
    res.json({ success: true, id, message: 'Restored from Trash.' });
  } catch (error) {
    next(error);
  }
}

export async function bulkAction(req, res, next) {
  try {
    const { ids, action } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No messages selected.' });
    }

    const auth = await getAuth(req);

    if (action === 'markRead') {
      await GmailService.batchModifyMessages(auth, ids, { removeLabelIds: ['UNREAD'] });
    } else if (action === 'markUnread') {
      await GmailService.batchModifyMessages(auth, ids, { addLabelIds: ['UNREAD'] });
    } else if (action === 'star') {
      await GmailService.batchModifyMessages(auth, ids, { addLabelIds: ['STARRED'] });
    } else if (action === 'unstar') {
      await GmailService.batchModifyMessages(auth, ids, { removeLabelIds: ['STARRED'] });
    } else if (action === 'archive') {
      await GmailService.batchModifyMessages(auth, ids, { removeLabelIds: ['INBOX'] });
    } else if (action === 'trash') {
      await Promise.all(ids.map((id) => GmailService.trashMessage(auth, id)));
    } else if (action === 'restore') {
      await Promise.all(ids.map((id) => GmailService.untrashMessage(auth, id)));
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported bulk action.' });
    }

    res.json({ success: true, count: ids.length, action });
  } catch (error) {
    next(error);
  }
}

export async function searchEmails(req, res, next) {
  try {
    const { q, pageToken, maxResults } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, data: { messages: [], nextPageToken: null } });
    }

    const auth = await getAuth(req);
    const data = await GmailService.listMessages(auth, {
      q,
      labelIds: [],
      pageToken,
      maxResults: parseInt(maxResults, 10) || 25
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getAttachment(req, res, next) {
  try {
    const { messageId, attachmentId } = req.params;
    const { filename, mimeType } = req.query;

    const auth = await getAuth(req);
    const { data } = await GmailService.getAttachment(auth, messageId, attachmentId);
    const fileBuffer = Buffer.from(data, 'base64url');

    const safeFilename = path.basename(String(filename || 'attachment')).replace(/[\r\n"]/g, '_');
    const safeMime = /^[a-z0-9.+/-]+$/i.test(String(mimeType || ''))
      ? String(mimeType)
      : 'application/octet-stream';

    res.setHeader('Content-Type', safeMime);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.send(fileBuffer);
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCounts(req, res, next) {
  try {
    const auth = await getAuth(req);
    const { counts, customLabels } = await GmailService.getUnreadCounts(auth);
    res.json({ success: true, counts, customLabels });
  } catch (error) {
    next(error);
  }
}

export async function getMailboxProfile(req, res, next) {
  try {
    const auth = await getAuth(req);
    const profile = await GmailService.getProfile(auth);
    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
}
