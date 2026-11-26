import api from './api';

export const authService = {
  getPublicConfig: async () => {
    return await api.get('/api/auth/config');
  },

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
  }
};

export default authService;
