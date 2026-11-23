import api from './api';

export const emailService = {
  getEmailsByFolder: async (folder = 'inbox', pageToken = null) => {
    const params = {};
    if (pageToken) params.pageToken = pageToken;
    return await api.get(`/api/emails/${folder}`, { params });
  },

  getEmailById: async (id) => {
    return await api.get(`/api/emails/${id}`);
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

  searchEmails: async (query, pageToken = null) => {
    const params = { q: query };
    if (pageToken) params.pageToken = pageToken;
    return await api.get('/api/emails/search', { params });
  },

  getAttachmentUrl: (messageId, attachmentId) => {
    return `/api/emails/${messageId}/attachments/${attachmentId}`;
  },

  getUnreadCounts: async () => {
    return await api.get('/api/emails/counts');
  }
};

export default emailService;
