const API_BASE = '/api';

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API error: ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Unable to connect to server. Please ensure the backend is running.');
    }
    throw error;
  }
}

export const api = {
  // Perfumes
  getPerfumes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/perfumes${query ? `?${query}` : ''}`);
  },
  getPerfume: (id) => fetchAPI(`/perfumes/${id}`),
  getFragranceFamilies: () => fetchAPI('/perfumes/meta/families'),
  getBrands: () => fetchAPI('/perfumes/meta/brands'),
  getNotes: () => fetchAPI('/perfumes/meta/notes'),
  explainNote: (name) => fetchAPI(`/notes/${encodeURIComponent(name)}/explain`),

  // Recommendations
  submitPreferences: (preferences) =>
    fetchAPI('/preferences', {
      method: 'POST',
      body: JSON.stringify(preferences),
    }),
  getRecommendations: (preferenceId) =>
    fetchAPI(`/recommendations/${preferenceId}`),

  // Interactions
  trackInteraction: (interaction) =>
    fetchAPI('/interactions', {
      method: 'POST',
      body: JSON.stringify(interaction),
    }),

  // Analytics
  getAnalyticsOverview: () => fetchAPI('/analytics/overview'),
  getPreferenceDistribution: () => fetchAPI('/analytics/preferences'),
  getPerfumePerformance: () => fetchAPI('/analytics/perfumes'),
  getRecommendationPerformance: () => fetchAPI('/analytics/recommendations'),
  getInteractionTrends: (days = 30) => fetchAPI(`/analytics/trends?days=${days}`),
  getTopNotes: () => fetchAPI('/analytics/notes'),
  getPriceDistribution: () => fetchAPI('/analytics/prices'),
  getRatingDistribution: () => fetchAPI('/analytics/ratings'),
};
