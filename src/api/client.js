import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});

export const api = {
  getDatasets: () => client.get('/datasets'),
  getCases: () => client.get('/cases'),
  compare: (payload, signal) => client.post('/comparison', payload, { signal }),
  getYearsToSignificance: (payload) => client.post('/years-to-significance', payload),
  getDatasetAnalysis: (id, params, signal) => client.get(`/datasets/${encodeURIComponent(id)}/analysis`, { params, signal }),
  getVariables: () => client.get("/variables"),
  getTimeseries: (params) => client.get("/timeseries", { params }),
  getTrend: (params) => client.get("/trend", { params }),
  getParadox: (params) => client.get("/paradox", { params }),
  createVerdict: (payload) => client.post("/verdict", payload),
  submitWizard: (payload) => client.post("/wizard", payload),
  getDemoCase: (caseId) => client.get(`/demo/${encodeURIComponent(caseId)}`),
};

export default client;
