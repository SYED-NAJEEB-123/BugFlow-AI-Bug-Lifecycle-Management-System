import api from './api';

export const aiService = {
  enhanceDescription: async (description, environment = 'Development') => {
    const response = await api.post('/ai/enhance-description', {
      description,
      environment
    });
    return response.data.enhanced;
  },

  classifyDefect: async (title, description) => {
    const response = await api.post('/ai/classify', { title, description });
    return response.data.classification;
  },

  predictTriage: async (title, description) => {
    const response = await api.post('/ai/predict-triage', { title, description });
    return response.data;
  },

  analyzeScreenshot: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/ai/analyze-screenshot', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.analysis;
  },

  findSimilarDefects: async (title, description, projectId = null) => {
    const response = await api.post('/ai/similar-defects', {
      title,
      description,
      project_id: projectId
    });
    return response.data.similar_defects;
  },

  getResolutionAssistance: async (issueId = null, defectData = {}) => {
    const response = await api.post('/ai/resolution-assistance', {
      issue_id: issueId,
      ...defectData
    });
    return response.data.assistance;
  },

  summarizeDefect: async (description, title = '') => {
    const response = await api.post('/ai/summarize-defect', {
      description,
      title
    });
    return response.data.summary;
  },

  ragResolution: async (issueId, defectData = {}) => {
    const response = await api.post('/ai/rag-resolution', {
      issue_id: issueId,
      ...defectData
    });
    return response.data;
  },

  knowledgeSearch: async (query = '', category = null) => {
    const response = await api.post('/ai/knowledge-search', {
      query,
      category
    });
    return response.data;
  },

  sendChatMessage: async (message, history = []) => {
    const response = await api.post('/ai/chat', {
      message,
      history
    });
    return response.data;
  },

  processScreenshotAgent: async (file, projectId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) {
      formData.append('project_id', projectId);
    }
    const response = await api.post('/ai/agent/process-screenshot', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  assignDefectAgent: async (issueId, overrideDevId = null) => {
    const response = await api.post('/ai/agent/assign-defect', {
      issue_id: issueId,
      override_developer_id: overrideDevId
    });
    return response.data;
  },

  getDeveloperSkills: async () => {
    const response = await api.get('/users/developers/skills');
    return response.data;
  },

  updateDeveloperSkills: async (userId, skills) => {
    const response = await api.put(`/users/developers/${userId}/skills`, typeof skills === 'object' ? skills : { skills });
    return response.data;
  },

  getDeveloperDashboard: async () => {
    const response = await api.get('/users/developers/dashboard');
    return response.data;
  },

  searchDeveloperQuery: async (query = '') => {
    const response = await api.post('/users/developers/search-query', { query });
    return response.data;
  },

  recommendDeveloper: async (defectData) => {
    const response = await api.post('/ai/recommend-developer', defectData);
    return response.data;
  },

  allocateDeveloper: async (issueId, overrideDevId = null) => {
    const response = await api.post('/ai/allocate-developer', {
      issue_id: issueId,
      override_developer_id: overrideDevId
    });
    return response.data;
  },

  getImpactAnalysis: async (defectData) => {
    const response = await api.post('/ai/impact-analysis', {
      issue_id: typeof defectData === 'number' || typeof defectData === 'string' ? defectData : null,
      ...(typeof defectData === 'object' ? defectData : {})
    });
    return response.data;
  },

  loadBalance: async () => {
    const response = await api.post('/ai/load-balance', {});
    return response.data;
  },

  whatIfAssignment: async (defectData, targetDeveloperId, projectId = null) => {
    const response = await api.post('/ai/what-if-assignment', {
      defect_data: defectData,
      target_developer_id: targetDeveloperId,
      project_id: projectId
    });
    return response.data;
  },

  getDeveloperWorkload: async (developerId = null) => {
    const endpoint = developerId ? `/users/developers/${developerId}/workload` : '/users/developers/workload';
    const response = await api.get(endpoint);
    return response.data;
  }
};

