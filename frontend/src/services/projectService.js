import api from './api';

export const projectService = {
  getProjects: async (searchQuery = '', statusFilter = '') => {
    const params = {};
    if (searchQuery) params.q = searchQuery;
    if (statusFilter) params.status = statusFilter;

    const response = await api.get('/projects', { params });
    return response.data;
  },

  getProjectById: async (id) => {
    const response = await api.get(`/projects/${id}`);
    return response.data.project;
  },

  createProject: async (projectData) => {
    const response = await api.post('/projects', projectData);
    return response.data;
  },

  updateProject: async (id, projectData) => {
    const response = await api.put(`/projects/${id}`, projectData);
    return response.data;
  },

  deleteProject: async (id) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },

  addMember: async (projectId, userId, role = 'Member') => {
    const response = await api.post(`/projects/${projectId}/members`, {
      user_id: userId,
      role_in_project: role
    });
    return response.data;
  },

  removeMember: async (projectId, userId) => {
    const response = await api.delete(`/projects/${projectId}/members/${userId}`);
    return response.data;
  }
};
