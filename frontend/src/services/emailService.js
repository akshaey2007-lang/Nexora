import api from './api';

export const emailService = {
  getEmailsByFolder: async (folder = 'inbox', pageToken = null, maxResults = 25) => {
    const params = { maxResults };
    if (pageToken) params.pageToken = pageToken;

    if (folder.startsWith('label:')) {
      const labelId = encodeURIComponent(folder.slice(6));
      return await api.get(`/api/emails/label/${labelId}`, { params });
    }
    return await api.get(`/api/emails/${folder}`, { params });
  },

  getEmailById: async (id) => {
    return await api.get(`/api/emails/${id}`);
  },

  getDraftById: async (id) => {
    return await api.get(`/api/emails/draft/${id}`);
  },

  sendEmail: async (formData) => {
    return await api.post('/api/emails/send', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  createDraft: async (formData) => {
    return await api.post('/api/emails/draft', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  updateDraft: async (id, formData) => {
    return await api.put(`/api/emails/draft/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  deleteDraft: async (id) => {
    return await api.delete(`/api/emails/draft/${id}`);
  },

  sendDraft: async (id) => {
    return await api.post(`/api/emails/draft/${id}/send`);
  },

  markRead: async (id, isRead = true) => {
    return await api.patch(`/api/emails/${id}/read`, { isRead });
  },

  toggleStar: async (id, isStarred) => {
    return await api.patch(`/api/emails/${id}/star`, { isStarred });
  },

  archiveEmail: async (id) => {
    return await api.patch(`/api/emails/${id}/archive`);
  },

  trashEmail: async (id) => {
    return await api.patch(`/api/emails/${id}/trash`);
  },

  restoreEmail: async (id) => {
    return await api.patch(`/api/emails/${id}/restore`);
  },

  bulkAction: async (ids, action) => {
    return await api.post('/api/emails/bulk', { ids, action });
  },

  searchEmails: async (query, pageToken = null, maxResults = 25) => {
    const params = { q: query, maxResults };
    if (pageToken) params.pageToken = pageToken;
    return await api.get('/api/emails/search', { params });
  },

  getAttachmentUrl: (messageId, attachmentId, filename = '', mimeType = '') => {
    const query = new URLSearchParams();
    if (filename) query.set('filename', filename);
    if (mimeType) query.set('mimeType', mimeType);
    const qs = query.toString();
    return `/api/emails/${messageId}/attachments/${attachmentId}${qs ? `?${qs}` : ''}`;
  },

  getUnreadCounts: async () => {
    return await api.get('/api/emails/counts');
  },

  getMailboxProfile: async () => {
    return await api.get('/api/emails/profile');
  }
};

export default emailService;
