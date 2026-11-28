import api from '../api';

export const schedulingService = {
  listScheduledEmails: async (status = '') => {
    const params = status ? { status } : {};
    return await api.get('/api/scheduled-emails', { params });
  },

  createScheduledEmail: async (payload) => {
    return await api.post('/api/scheduled-emails', payload);
  },

  parseInstruction: async (text, timezone = 'UTC') => {
    return await api.post('/api/scheduled-emails/parse', { text, timezone });
  },

  updateScheduledEmail: async (id, payload) => {
    return await api.put(`/api/scheduled-emails/${id}`, payload);
  },

  cancelScheduledEmail: async (id) => {
    return await api.patch(`/api/scheduled-emails/${id}/cancel`);
  },

  deleteScheduledEmail: async (id) => {
    return await api.delete(`/api/scheduled-emails/${id}`);
  },

  processMineNow: async () => {
    return await api.post('/api/scheduled-emails/process-mine');
  }
};

export default schedulingService;
