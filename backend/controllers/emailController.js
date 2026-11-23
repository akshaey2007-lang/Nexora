import { GmailService } from '../services/gmailService.js';
import { getAuthorizedClient } from '../services/tokenService.js';
import { demoStore } from '../services/demoService.js';
import { logger } from '../utils/logger.js';

async function getAuth(req) {
  if (req.isDemo) return null;
  return await getAuthorizedClient(req.user);
}

export async function getInbox(req, res, next) {
  try {
    const { pageToken, maxResults } = req.query;
    if (req.isDemo) {
      return res.json({
        success: true,
        data: demoStore.list({ folder: 'inbox' })
      });
    }

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
    if (req.isDemo) {
      return res.json({
        success: true,
        data: demoStore.list({ folder: 'sent' })
      });
    }

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
    if (req.isDemo) {
      return res.json({
        success: true,
        data: demoStore.list({ folder: 'starred' })
      });
    }

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
    if (req.isDemo) {
      return res.json({
        success: true,
        data: demoStore.list({ folder: 'important' })
      });
    }

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

export async function getDrafts(req, res, next) {
  try {
    const { pageToken, maxResults } = req.query;
    if (req.isDemo) {
      return res.json({
        success: true,
        data: demoStore.list({ folder: 'drafts' })
      });
    }

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

export async function getSpam(req, res, next) {
  try {
    const { pageToken, maxResults } = req.query;
    if (req.isDemo) {
      return res.json({
        success: true,
        data: demoStore.list({ folder: 'spam' })
      });
    }

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
    if (req.isDemo) {
      return res.json({
        success: true,
        data: demoStore.list({ folder: 'trash' })
      });
    }

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
    if (req.isDemo) {
      const email = demoStore.get(id);
      if (!email) {
        return res.status(404).json({ success: false, message: 'Message not found' });
      }
      return res.json({ success: true, email });
    }

    const auth = await getAuth(req);
    const email = await GmailService.getMessage(auth, id);
    res.json({ success: true, email });
  } catch (error) {
    next(error);
  }
}

export async function sendEmail(req, res, next) {
  try {
    const { to, cc, bcc, subject, body, inReplyTo, references, threadId } = req.body;
    const attachments = req.files || [];

    if (!to) {
      return res.status(400).json({ success: false, message: 'Recipient address (To) is required.' });
    }

    if (req.isDemo) {
      const sent = demoStore.send({
        to,
        cc,
        bcc,
        subject,
        body,
        attachments
      });
      return res.json({
        success: true,
        message: 'Email successfully sent (Demo simulation)',
        email: sent
      });
    }

    const auth = await getAuth(req);
    const userEmail = req.user.email;

    const result = await GmailService.sendMessage(auth, {
      from: userEmail,
      to,
      cc,
      bcc,
      subject,
      body,
      isHtml: true,
      attachments,
      inReplyTo,
      references,
      threadId
    });

    res.json({
      success: true,
      message: 'Email successfully sent via Gmail API.',
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

    if (req.isDemo) {
      const draft = demoStore.createDraft({ to, cc, bcc, subject, body });
      return res.json({ success: true, draft });
    }

    const auth = await getAuth(req);
    const result = await GmailService.createDraft(auth, {
      from: req.user.email,
      to,
      cc,
      bcc,
      subject,
      body,
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

    if (req.isDemo) {
      const draft = demoStore.updateDraft(id, { to, cc, bcc, subject, body });
      return res.json({ success: true, draft });
    }

    const auth = await getAuth(req);
    const result = await GmailService.updateDraft(auth, id, {
      from: req.user.email,
      to,
      cc,
      bcc,
      subject,
      body,
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
    if (req.isDemo) {
      demoStore.deleteDraft(id);
      return res.json({ success: true, message: 'Draft deleted' });
    }

    const auth = await getAuth(req);
    await GmailService.deleteDraft(auth, id);
    res.json({ success: true, message: 'Draft removed from Gmail' });
  } catch (error) {
    next(error);
  }
}

export async function sendDraft(req, res, next) {
  try {
    const { id } = req.params;
    if (req.isDemo) {
      const draft = demoStore.get(id);
      if (draft) {
        demoStore.deleteDraft(id);
        demoStore.send(draft);
      }
      return res.json({ success: true, message: 'Draft sent' });
    }

    const auth = await getAuth(req);
    const result = await GmailService.sendDraft(auth, id);
    res.json({ success: true, message: 'Draft sent via Gmail API', data: result });
  } catch (error) {
    next(error);
  }
}

export async function markRead(req, res, next) {
  try {
    const { id } = req.params;
    const { isRead = true } = req.body;

    if (req.isDemo) {
      demoStore.markRead(id, isRead);
      return res.json({ success: true, id, isUnread: !isRead });
    }

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

    if (req.isDemo) {
      const email = demoStore.toggleStar(id);
      return res.json({ success: true, id, isStarred: email ? email.isStarred : false });
    }

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
    if (req.isDemo) {
      demoStore.archive(id);
      return res.json({ success: true, id, message: 'Message archived' });
    }

    const auth = await getAuth(req);
    await GmailService.modifyMessage(auth, id, {
      removeLabelIds: ['INBOX']
    });

    res.json({ success: true, id, message: 'Message archived from Inbox' });
  } catch (error) {
    next(error);
  }
}

export async function trashEmail(req, res, next) {
  try {
    const { id } = req.params;
    if (req.isDemo) {
      demoStore.trash(id);
      return res.json({ success: true, id, message: 'Message moved to trash' });
    }

    const auth = await getAuth(req);
    await GmailService.trashMessage(auth, id);
    res.json({ success: true, id, message: 'Message moved to Gmail Trash' });
  } catch (error) {
    next(error);
  }
}

export async function restoreEmail(req, res, next) {
  try {
    const { id } = req.params;
    if (req.isDemo) {
      demoStore.untrash(id);
      return res.json({ success: true, id, message: 'Message restored from trash' });
    }

    const auth = await getAuth(req);
    await GmailService.untrashMessage(auth, id);
    res.json({ success: true, id, message: 'Message restored from Trash' });
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

    if (req.isDemo) {
      return res.json({
        success: true,
        data: demoStore.list({ q })
      });
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

    if (req.isDemo) {
      // In demo mode send sample text/file data
      const sampleContent = Buffer.from('NEXORA MAIL Sample Attachment Content');
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename="demo_document.txt"');
      return res.send(sampleContent);
    }

    const auth = await getAuth(req);
    const { data } = await GmailService.getAttachment(auth, messageId, attachmentId);
    const fileBuffer = Buffer.from(data, 'base64');

    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(fileBuffer);
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCounts(req, res, next) {
  try {
    if (req.isDemo) {
      return res.json({
        success: true,
        counts: demoStore.getCounts()
      });
    }

    const auth = await getAuth(req);
    const counts = await GmailService.getUnreadCounts(auth);
    res.json({ success: true, counts });
  } catch (error) {
    next(error);
  }
}
