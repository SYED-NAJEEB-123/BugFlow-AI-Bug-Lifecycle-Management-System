import api from './api';

export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.access_token) {
      localStorage.setItem('bugflow_token', response.data.access_token);
      localStorage.setItem('bugflow_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.access_token) {
      localStorage.setItem('bugflow_token', response.data.access_token);
      localStorage.setItem('bugflow_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    if (response.data.user) {
      localStorage.setItem('bugflow_user', JSON.stringify(response.data.user));
    }
    return response.data.user;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    if (response.data.user) {
      localStorage.setItem('bugflow_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  changePassword: async (passwordData) => {
    const response = await api.post('/auth/change-password', passwordData);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('bugflow_token');
    localStorage.removeItem('bugflow_user');
  },

  getStoredUser: () => {
    const userStr = localStorage.getItem('bugflow_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  getToken: () => localStorage.getItem('bugflow_token'),

  // Admin APIs
  getUsers: async (roleFilter) => {
    const params = roleFilter ? { role: roleFilter } : {};
    const response = await api.get('/users', { params });
    return response.data;
  },

  updateUserRole: async (userId, data) => {
    const response = await api.put(`/users/${userId}/role`, data);
    return response.data;
  }
};
