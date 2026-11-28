import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import emailService from '../services/emailService';
import schedulingService from '../services/scheduling/schedulingService';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

const EmailContext = createContext(null);

const INITIAL_COUNTS = {
  inbox: 0,
  starred: 0,
  sent: 0,
  drafts: 0,
  spam: 0,
  trash: 0,
  important: 0
};

export function EmailProvider({ children }) {
  const { isAuthenticated, user, settings } = useAuth();
  const { success, error } = useToast();

  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [emails, setEmails] = useState([]);
  const [customLabels, setCustomLabels] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [counts, setCounts] = useState(INITIAL_COUNTS);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [nextPageToken, setNextPageToken] = useState(null);

  const prevInboxUnreadRef = useRef(null);

  // Compose State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    inReplyTo: '',
    references: '',
    threadId: '',
    draftId: null
  });

  const emailsPerPage = settings?.emailsPerPage || 25;

  // Fetch genuine unread/total counts and user labels
  const fetchCounts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await emailService.getUnreadCounts();
      if (res && res.counts) {
        // Trigger genuine browser notification if unread count increased and user enabled notifications
        if (
          prevInboxUnreadRef.current !== null &&
          res.counts.inbox > prevInboxUnreadRef.current &&
          settings?.notificationsEnabled &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          const diff = res.counts.inbox - prevInboxUnreadRef.current;
          new Notification('Nexora Mail', {
            body: `You have ${diff} new unread ${diff === 1 ? 'message' : 'messages'} in your inbox.`
          });
        }
        prevInboxUnreadRef.current = res.counts.inbox;
        setCounts(res.counts);
      }
      if (res && Array.isArray(res.customLabels)) {
        setCustomLabels(res.customLabels);
      }
    } catch {
      // Non-blocking badge refresh
    }
  }, [isAuthenticated, settings?.notificationsEnabled]);

  const refreshScheduledCount = useCallback(async () => {
    if (!isAuthenticated) {
      setScheduledCount(0);
      return;
    }
    try {
      const res = await schedulingService.listScheduledEmails('Scheduled');
      if (res?.summary?.Scheduled !== undefined) {
        setScheduledCount(res.summary.Scheduled);
      } else if (Array.isArray(res?.scheduledEmails)) {
        setScheduledCount(res.scheduledEmails.length);
      }
    } catch {
      // Non-blocking scheduled badge refresh
    }
  }, [isAuthenticated]);

  // Load emails for active folder or search query
  const loadEmails = useCallback(
    async (folder = currentFolder, query = searchQuery) => {
      if (!isAuthenticated) return;
      setLoadingEmails(true);
      setSelectedIds([]);
      try {
        let res;
        if (query && query.trim()) {
          res = await emailService.searchEmails(query.trim(), null, emailsPerPage);
        } else {
          res = await emailService.getEmailsByFolder(folder, null, emailsPerPage);
        }

        const list = res?.data?.messages || res?.data?.drafts || [];
        setEmails(list);
        setNextPageToken(res?.data?.nextPageToken || null);
      } catch (err) {
        error(err.message || 'Failed to retrieve emails.');
        setEmails([]);
        setNextPageToken(null);
      } finally {
        setLoadingEmails(false);
      }
    },
    [isAuthenticated, currentFolder, searchQuery, emailsPerPage, error]
  );

  // Load next page via Gmail pageToken
  const loadMoreEmails = useCallback(async () => {
    if (!isAuthenticated || !nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      let res;
      if (searchQuery && searchQuery.trim()) {
        res = await emailService.searchEmails(searchQuery.trim(), nextPageToken, emailsPerPage);
      } else {
        res = await emailService.getEmailsByFolder(currentFolder, nextPageToken, emailsPerPage);
      }
      const list = res?.data?.messages || res?.data?.drafts || [];
      setEmails((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const unique = list.filter((m) => !seen.has(m.id));
        return [...prev, ...unique];
      });
      setNextPageToken(res?.data?.nextPageToken || null);
    } catch (err) {
      error(err.message || 'Failed to load more messages.');
    } finally {
      setLoadingMore(false);
    }
  }, [isAuthenticated, nextPageToken, loadingMore, searchQuery, currentFolder, emailsPerPage, error]);

  // Open compose modal (also handles reply/forward/draft editing)
  const openCompose = useCallback(
    (initial = {}) => {
      const savedSig = settings?.signature?.trim();
      const defaultBody =
        initial.body !== undefined
          ? initial.body
          : savedSig
          ? `<br><br><div style="color:#64748b;">${savedSig.replace(/\n/g, '<br>')}</div>`
          : '';

      setComposeData({
        to: initial.to || '',
        cc: initial.cc || '',
        bcc: initial.bcc || '',
        subject: initial.subject || '',
        body: defaultBody,
        inReplyTo: initial.inReplyTo || '',
        references: initial.references || '',
        threadId: initial.threadId || '',
        draftId: initial.draftId || null
      });
      setIsComposeOpen(true);
    },
    [settings?.signature]
  );

  const closeCompose = useCallback(() => {
    setIsComposeOpen(false);
  }, []);

  // Load specific email details or open draft for editing
  const selectEmail = useCallback(
    async (id, item = null) => {
      if (!id) {
        setSelectedEmail(null);
        setSelectedEmailId(null);
        return;
      }

      if (currentFolder === 'drafts' || item?.isDraft) {
        try {
          const res = await emailService.getDraftById(id);
          if (res?.draft) {
            const d = res.draft;
            openCompose({
              to: d.to || '',
              cc: d.cc || '',
              bcc: d.bcc || '',
              subject: d.subject === '(No Subject)' ? '' : d.subject || '',
              body: d.bodyHtml || d.bodyText || '',
              threadId: d.threadId || '',
              draftId: d.draftId || id
            });
          }
        } catch (err) {
          error(err.message || 'Could not open draft.');
        }
        return;
      }

      setSelectedEmailId(id);
      setLoadingDetail(true);
      try {
        const res = await emailService.getEmailById(id);
        if (res && res.email) {
          const wasUnread = res.email.isUnread;
          setSelectedEmail({ ...res.email, isUnread: false });

          setEmails((prev) =>
            prev.map((m) =>
              m.id === id ? { ...m, isUnread: false, labels: m.labels?.filter((l) => l !== 'UNREAD') } : m
            )
          );

          if (wasUnread) {
            emailService
              .markRead(id, true)
              .then(() => fetchCounts())
              .catch(() => {});
          }
        }
      } catch (err) {
        error(err.message || 'Could not load email content.');
        setSelectedEmail(null);
      } finally {
        setLoadingDetail(false);
      }
    },
    [currentFolder, openCompose, error, fetchCounts]
  );

  // Initial & Dependency Load (and clear state on logout)
  useEffect(() => {
    if (isAuthenticated) {
      loadEmails(currentFolder, searchQuery);
      fetchCounts();
      refreshScheduledCount();
    } else {
      setEmails([]);
      setCustomLabels([]);
      setSelectedEmail(null);
      setSelectedEmailId(null);
      setSelectedIds([]);
      setCounts(INITIAL_COUNTS);
      setScheduledCount(0);
      setNextPageToken(null);
      prevInboxUnreadRef.current = null;
    }
  }, [isAuthenticated, currentFolder, searchQuery, loadEmails, fetchCounts, refreshScheduledCount]);

  // Single Email Actions
  const toggleStar = async (id, e) => {
    if (e) e.stopPropagation();
    const target = emails.find((m) => m.id === id) || (selectedEmail?.id === id ? selectedEmail : null);
    const newStarred = target ? !target.isStarred : true;

    setEmails((prev) => prev.map((m) => (m.id === id ? { ...m, isStarred: newStarred } : m)));
    if (selectedEmail && selectedEmail.id === id) {
      setSelectedEmail((prev) => ({ ...prev, isStarred: newStarred }));
    }

    try {
      await emailService.toggleStar(id, newStarred);
      fetchCounts();
    } catch {
      error('Failed to update star status.');
      setEmails((prev) => prev.map((m) => (m.id === id ? { ...m, isStarred: !newStarred } : m)));
    }
  };

  const markRead = async (id, isRead = true, e) => {
    if (e) e.stopPropagation();
    setEmails((prev) => prev.map((m) => (m.id === id ? { ...m, isUnread: !isRead } : m)));
    if (selectedEmail && selectedEmail.id === id) {
      setSelectedEmail((prev) => ({ ...prev, isUnread: !isRead }));
    }

    try {
      await emailService.markRead(id, isRead);
      fetchCounts();
      success(isRead ? 'Marked as read.' : 'Marked as unread.');
    } catch {
      error('Failed to update read status.');
    }
  };

  const archiveEmail = async (id, e) => {
    if (e) e.stopPropagation();
    setEmails((prev) => prev.filter((m) => m.id !== id));
    if (selectedEmailId === id) {
      setSelectedEmail(null);
      setSelectedEmailId(null);
    }

    try {
      await emailService.archiveEmail(id);
      success('Conversation archived.');
      fetchCounts();
    } catch {
      error('Failed to archive email.');
      loadEmails();
    }
  };

  const trashEmail = async (id, e) => {
    if (e) e.stopPropagation();
    setEmails((prev) => prev.filter((m) => m.id !== id));
    if (selectedEmailId === id) {
      setSelectedEmail(null);
      setSelectedEmailId(null);
    }

    try {
      if (currentFolder === 'drafts') {
        await emailService.deleteDraft(id);
        success('Draft discarded.');
      } else {
        await emailService.trashEmail(id);
        success('Moved to Trash.');
      }
      fetchCounts();
    } catch {
      error(currentFolder === 'drafts' ? 'Failed to delete draft.' : 'Failed to move message to Trash.');
      loadEmails();
    }
  };

  const restoreEmail = async (id, e) => {
    if (e) e.stopPropagation();
    setEmails((prev) => prev.filter((m) => m.id !== id));
    if (selectedEmailId === id) {
      setSelectedEmail(null);
      setSelectedEmailId(null);
    }

    try {
      await emailService.restoreEmail(id);
      success('Message restored to Inbox.');
      fetchCounts();
    } catch {
      error('Failed to restore email.');
      loadEmails();
    }
  };

  // Bulk Selection & Actions
  const toggleSelectId = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === emails.length && emails.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(emails.map((m) => m.id));
    }
  };

  const clearSelection = () => setSelectedIds([]);

  const performBulkAction = async (action) => {
    if (selectedIds.length === 0) return;
    const idsToProcess = [...selectedIds];

    // Optimistic UI updates
    if (action === 'archive' || action === 'trash' || action === 'restore') {
      setEmails((prev) => prev.filter((m) => !idsToProcess.includes(m.id)));
      if (idsToProcess.includes(selectedEmailId)) {
        setSelectedEmail(null);
        setSelectedEmailId(null);
      }
    } else if (action === 'markRead') {
      setEmails((prev) => prev.map((m) => (idsToProcess.includes(m.id) ? { ...m, isUnread: false } : m)));
    } else if (action === 'markUnread') {
      setEmails((prev) => prev.map((m) => (idsToProcess.includes(m.id) ? { ...m, isUnread: true } : m)));
    } else if (action === 'star') {
      setEmails((prev) => prev.map((m) => (idsToProcess.includes(m.id) ? { ...m, isStarred: true } : m)));
    }

    setSelectedIds([]);

    try {
      if (currentFolder === 'drafts' && action === 'trash') {
        await Promise.all(idsToProcess.map((id) => emailService.deleteDraft(id)));
        success(`${idsToProcess.length} draft(s) deleted.`);
      } else {
        await emailService.bulkAction(idsToProcess, action);
        const labels = {
          markRead: 'Marked as read.',
          markUnread: 'Marked as unread.',
          star: 'Starred selected messages.',
          archive: `Archived ${idsToProcess.length} message(s).`,
          trash: `Moved ${idsToProcess.length} message(s) to Trash.`,
          restore: `Restored ${idsToProcess.length} message(s).`
        };
        success(labels[action] || 'Bulk action completed.');
      }
      fetchCounts();
    } catch (err) {
      error(err.message || 'Bulk action failed.');
      loadEmails();
    }
  };

  // Reply, Reply All & Forward
  const handleReply = (email) => {
    if (!email) return;
    openCompose({
      to: email.fromEmail || email.from,
      subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}`,
      inReplyTo: email.messageId,
      references: email.references ? `${email.references} ${email.messageId}` : email.messageId,
      threadId: email.threadId,
      body: `<br><br><blockquote style="border-left:2px solid #cbd5e1;padding-left:12px;margin:0;color:#64748b;">On ${email.date}, ${email.fromName || email.from} wrote:<br>${email.bodyHtml || email.bodyText || ''}</blockquote>`
    });
  };

  const handleReplyAll = (email) => {
    if (!email) return;
    const myEmail = (user?.email || '').toLowerCase();
    const parseAddresses = (str) =>
      (str || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    const extractEmail = (addr) => {
      const m = addr.match(/<([^>]+)>/);
      return (m ? m[1] : addr).trim().toLowerCase();
    };

    const replyTo = email.fromEmail || email.from || '';
    const otherRecipients = [...parseAddresses(email.to), ...parseAddresses(email.cc)].filter((addr) => {
      const clean = extractEmail(addr);
      return clean && clean !== myEmail && clean !== extractEmail(replyTo);
    });

    openCompose({
      to: replyTo,
      cc: otherRecipients.join(', '),
      subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}`,
      inReplyTo: email.messageId,
      references: email.references ? `${email.references} ${email.messageId}` : email.messageId,
      threadId: email.threadId,
      body: `<br><br><blockquote style="border-left:2px solid #cbd5e1;padding-left:12px;margin:0;color:#64748b;">On ${email.date}, ${email.fromName || email.from} wrote:<br>${email.bodyHtml || email.bodyText || ''}</blockquote>`
    });
  };

  const handleForward = (email) => {
    if (!email) return;
    openCompose({
      to: '',
      subject: email.subject?.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject || ''}`,
      body: `<br><br><blockquote style="border-left:2px solid #cbd5e1;padding-left:12px;margin:0;color:#64748b;">---------- Forwarded message ---------<br>From: ${email.from}<br>Date: ${email.date}<br>Subject: ${email.subject}<br>To: ${email.to}<br><br>${email.bodyHtml || email.bodyText || ''}</blockquote>`
    });
  };

  return (
    <EmailContext.Provider
      value={{
        currentFolder,
        setCurrentFolder,
        emails,
        customLabels,
        selectedEmail,
        selectedEmailId,
        selectEmail,
        selectedIds,
        toggleSelectId,
        toggleSelectAll,
        clearSelection,
        performBulkAction,
        loadingEmails,
        loadingMore,
        loadingDetail,
        nextPageToken,
        loadMoreEmails,
        counts,
        scheduledCount,
        refreshScheduledCount,
        searchQuery,
        setSearchQuery,
        loadEmails,
        toggleStar,
        markRead,
        archiveEmail,
        trashEmail,
        restoreEmail,
        isComposeOpen,
        composeData,
        openCompose,
        closeCompose,
        handleReply,
        handleReplyAll,
        handleForward,
        fetchCounts
      }}
    >
      {children}
    </EmailContext.Provider>
  );
}

export function useEmails() {
  const context = useContext(EmailContext);
  if (!context) {
    throw new Error('useEmails must be used within an EmailProvider');
  }
  return context;
}
