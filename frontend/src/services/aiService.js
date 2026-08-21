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
  }
};
