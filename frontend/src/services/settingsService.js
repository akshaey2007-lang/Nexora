import api from './api';

export const settingsService = {
  getSettings: async () => {
    return await api.get('/api/settings');
  },

  updateSettings: async (settingsData) => {
    return await api.put('/api/settings', settingsData);
  }
};

export default settingsService;
