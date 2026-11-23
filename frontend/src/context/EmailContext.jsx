import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import emailService from '../services/emailService';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

const EmailContext = createContext(null);

export function EmailProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { success, error } = useToast();

  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [counts, setCounts] = useState({ inbox: 0, starred: 0, sent: 0, drafts: 0, spam: 0, trash: 0, important: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [nextPageToken, setNextPageToken] = useState(null);

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

  // Fetch unread / total counts
  const fetchCounts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await emailService.getUnreadCounts();
      if (res && res.counts) {
        setCounts(res.counts);
      }
    } catch (err) {
      // Quiet fail for badge counts
    }
  }, [isAuthenticated]);

  // Load emails for folder or search
  const loadEmails = useCallback(async (folder = currentFolder, query = searchQuery) => {
    if (!isAuthenticated) return;
    setLoadingEmails(true);
    try {
      let res;
      if (query && query.trim()) {
        res = await emailService.searchEmails(query.trim());
      } else {
        res = await emailService.getEmailsByFolder(folder);
      }

      const list = res?.data?.messages || res?.data?.drafts || [];
      setEmails(list);
      setNextPageToken(res?.data?.nextPageToken || null);
    } catch (err) {
      error(err.message || 'Failed to retrieve emails.');
      setEmails([]);
    } finally {
      setLoadingEmails(false);
    }
  }, [isAuthenticated, currentFolder, searchQuery, error]);

  // Load specific email details
  const selectEmail = useCallback(async (id) => {
    if (!id) {
      setSelectedEmail(null);
      setSelectedEmailId(null);
      return;
    }

    setSelectedEmailId(id);
    setLoadingDetail(true);
    try {
      const res = await emailService.getEmailById(id);
      if (res && res.email) {
        setSelectedEmail(res.email);

        // Optimistically mark as read in local list if unread
        setEmails((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, isUnread: false, labels: item.labels?.filter((l) => l !== 'UNREAD') } : item
          )
        );

        // Notify server
        if (res.email.isUnread) {
          emailService.markRead(id, true).catch(() => {});
          fetchCounts();
        }
      }
    } catch (err) {
      error(err.message || 'Could not load email body.');
      setSelectedEmail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, [error, fetchCounts]);

  // Initial & Dependency Load
  useEffect(() => {
    if (isAuthenticated) {
      loadEmails(currentFolder, searchQuery);
      fetchCounts();
    }
  }, [isAuthenticated, currentFolder, searchQuery, loadEmails, fetchCounts]);

  // Email Actions
  const toggleStar = async (id, e) => {
    if (e) e.stopPropagation();
    const target = emails.find((m) => m.id === id);
    const newStarred = target ? !target.isStarred : true;

    // Optimistic UI update
    setEmails((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isStarred: newStarred } : m))
    );
    if (selectedEmail && selectedEmail.id === id) {
      setSelectedEmail((prev) => ({ ...prev, isStarred: newStarred }));
    }

    try {
      await emailService.toggleStar(id, newStarred);
      fetchCounts();
    } catch (err) {
      error('Failed to update star status');
      // Revert on error
      setEmails((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isStarred: !newStarred } : m))
      );
    }
  };

  const markRead = async (id, isRead = true, e) => {
    if (e) e.stopPropagation();
    setEmails((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isUnread: !isRead } : m))
    );
    if (selectedEmail && selectedEmail.id === id) {
      setSelectedEmail((prev) => ({ ...prev, isUnread: !isRead }));
    }

    try {
      await emailService.markRead(id, isRead);
      fetchCounts();
      success(isRead ? 'Marked as read' : 'Marked as unread');
    } catch (err) {
      error('Failed to mark read status');
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
      success('Email archived');
      fetchCounts();
    } catch (err) {
      error('Failed to archive email');
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
      await emailService.trashEmail(id);
      success('Email moved to Trash');
      fetchCounts();
    } catch (err) {
      error('Failed to trash email');
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
      success('Email restored from Trash');
      fetchCounts();
    } catch (err) {
      error('Failed to restore email');
    }
  };

  // Compose Modal Handlers
  const openCompose = (initial = {}) => {
    setComposeData({
      to: initial.to || '',
      cc: initial.cc || '',
      bcc: initial.bcc || '',
      subject: initial.subject || '',
      body: initial.body || '',
      inReplyTo: initial.inReplyTo || '',
      references: initial.references || '',
      threadId: initial.threadId || '',
      draftId: initial.draftId || null
    });
    setIsComposeOpen(true);
  };

  const closeCompose = () => {
    setIsComposeOpen(false);
  };

  const handleReply = (email) => {
    if (!email) return;
    openCompose({
      to: email.fromEmail || email.from,
      subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}`,
      inReplyTo: email.messageId,
      references: email.messageId,
      threadId: email.threadId,
      body: `<br><br><div style="border-left: 2px solid #536DFE; padding-left: 12px; margin-left: 4px; color: #6B7280;">On ${email.date}, ${email.fromName || email.from} wrote:<br>${email.bodyHtml || email.bodyText || ''}</div>`
    });
  };

  const handleForward = (email) => {
    if (!email) return;
    openCompose({
      to: '',
      subject: email.subject?.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject || ''}`,
      body: `<br><br><div style="border-left: 2px solid #8791A5; padding-left: 12px; margin-left: 4px; color: #6B7280;">---------- Forwarded message ---------<br>From: ${email.from}<br>Date: ${email.date}<br>Subject: ${email.subject}<br>To: ${email.to}<br><br>${email.bodyHtml || email.bodyText || ''}</div>`
    });
  };

  return (
    <EmailContext.Provider
      value={{
        currentFolder,
        setCurrentFolder,
        emails,
        selectedEmail,
        selectedEmailId,
        selectEmail,
        loadingEmails,
        loadingDetail,
        counts,
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
