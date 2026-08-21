import api from './api';

export const analyticsService = {
  getAnalytics: async (projectId = null) => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await api.get('/analytics', { params });
    return response.data;
  }
};
