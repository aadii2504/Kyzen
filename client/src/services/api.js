const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const request = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

// Zone API
export const fetchZones = () => request('/api/zones');
export const fetchZone = (id) => request(`/api/zones/${id}`);
export const updateZoneOccupancy = (id, body) => request(`/api/zones/${id}/occupancy`, { method: 'PATCH', body });

// Vendor API
export const fetchVendors = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/vendors${query ? `?${query}` : ''}`);
};
export const fetchVendor = (id) => request(`/api/vendors/${id}`);
export const updateVendorQueue = (id, body) => request(`/api/vendors/${id}/update`, { method: 'POST', body });
export const fetchVendorQR = (id) => request(`/api/vendors/${id}/qr`);

// Crowd API
export const submitCrowdReport = (body) => request('/api/crowd/report', { method: 'POST', body });
export const fetchHeatmapData = () => request('/api/crowd/heatmap');
export const fetchCrowdHistory = (zoneId) => request(`/api/crowd/history/${zoneId}`);

// Pulse API
export const fetchPulse = () => request('/api/pulse');
export const fetchPulseHistory = () => request('/api/pulse/history');

// Journey API
export const planJourney = (body) => request('/api/journey/plan', { method: 'POST', body });
export const fetchJourney = (id) => request(`/api/journey/${id}`);
export const updateJourneyStatus = (id, status) => request(`/api/journey/${id}/status`, { method: 'PATCH', body: { status } });

// Admin API
export const adminLogin = (password) => request('/api/admin/login', { method: 'POST', body: { password } });
export const fetchAnalytics = () => request('/api/admin/analytics');
export const toggleEmergency = (activate, message, password) => request('/api/admin/emergency', { method: 'POST', body: { activate, message, password }, headers: { 'x-admin-password': password } });
export const sendAnnouncement = (message, type, password) => request('/api/admin/announce', { method: 'POST', body: { message, type, password }, headers: { 'x-admin-password': password } });

// Event API
export const fetchCurrentEvent = () => request('/api/events/current');
