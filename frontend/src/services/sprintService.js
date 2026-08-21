import api from './api';

export const sprintService = {
  getSprints: async (params) => {
    const response = await api.get('/sprints', { params });
    return response.data;
  },

  getSprint: async (sprintId) => {
    const response = await api.get(`/sprints/${sprintId}`);
    return response.data.sprint;
  },

  createSprint: async (sprintData) => {
    const response = await api.post('/sprints', sprintData);
    return response.data;
  },

  updateSprint: async (sprintId, sprintData) => {
    const response = await api.put(`/sprints/${sprintId}`, sprintData);
    return response.data;
  },

  deleteSprint: async (sprintId) => {
    const response = await api.delete(`/sprints/${sprintId}`);
    return response.data;
  },

  startSprint: async (sprintId) => {
    const response = await api.post(`/sprints/${sprintId}/start`);
    return response.data;
  },

  completeSprint: async (sprintId) => {
    const response = await api.post(`/sprints/${sprintId}/complete`);
    return response.data;
  },

  assignDefects: async (sprintId, issueIds) => {
    const response = await api.post(`/sprints/${sprintId}/defects`, { issue_ids: issueIds });
    return response.data;
  },

  removeDefect: async (sprintId, issueId) => {
    const response = await api.delete(`/sprints/${sprintId}/defects/${issueId}`);
    return response.data;
  },

  getAiAdvisor: async (sprintId) => {
    const response = await api.post(`/sprints/${sprintId}/ai-advisor`);
    return response.data;
  }
};
