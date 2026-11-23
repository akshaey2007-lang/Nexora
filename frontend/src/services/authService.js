import api from './api';

export const authService = {
  getAuthUrl: async () => {
    return await api.get('/auth/google');
  },

  getCurrentUser: async () => {
    return await api.get('/api/auth/me');
  },

  logout: async () => {
    return await api.post('/api/auth/logout');
  },

  disconnect: async () => {
    return await api.post('/api/auth/disconnect');
  },

  enableDemoMode: async () => {
    return await api.post('/auth/demo');
  }
};

export default authService;
