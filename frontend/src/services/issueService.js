import api from './api';

export const issueService = {
  getIssues: async (params = {}) => {
    const response = await api.get('/issues', { params });
    return response.data;
  },

  getIssueById: async (id) => {
    const response = await api.get(`/issues/${id}`);
    return response.data.issue;
  },

  createIssue: async (issueData) => {
    const response = await api.post('/issues', issueData);
    return response.data;
  },

  updateIssue: async (id, issueData) => {
    const response = await api.put(`/issues/${id}`, issueData);
    return response.data;
  },

  updateStatus: async (id, statusData) => {
    const response = await api.put(`/issues/${id}/status`, statusData);
    return response.data;
  },

  assignIssue: async (id, assigneeId) => {
    const response = await api.put(`/issues/${id}/assign`, { assignee_id: assigneeId });
    return response.data;
  },

  deleteIssue: async (id) => {
    const response = await api.delete(`/issues/${id}`);
    return response.data;
  },

  getComments: async (id) => {
    const response = await api.get(`/issues/${id}/comments`);
    return response.data.comments;
  },

  addComment: async (id, content, isAiGenerated = false) => {
    const response = await api.post(`/issues/${id}/comments`, {
      content,
      is_ai_generated: isAiGenerated
    });
    return response.data;
  },

  uploadAttachment: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/issues/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Semantic Defect Search
  semanticSearch: async (searchPayload) => {
    const response = await api.post('/issues/semantic-search', searchPayload);
    return response.data;
  },

  // Intelligent Duplicate Check
  checkDuplicates: async (defectPayload) => {
    const response = await api.post('/issues/check-duplicates', defectPayload);
    return response.data;
  }
};
