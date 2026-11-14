import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

export const api = {
  getVariables: () => client.get("/variables"),
  getTimeseries: (params) => client.get("/timeseries", { params }),
  getTrend: (params) => client.get("/trend", { params }),
  getParadox: (params) => client.get("/paradox", { params }),
  createVerdict: (payload) => client.post("/verdict", payload),
  submitWizard: (payload) => client.post("/wizard", payload),
  getDemoCase: (caseId) => client.get(`/demo/${encodeURIComponent(caseId)}`),
};

export default client;
