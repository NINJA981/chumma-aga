import axios from 'axios';

export const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        return Promise.reject(error);
    }
);

// API functions
export const authApi = {
    login: (email, password) =>
        api.post('/auth/login', { email, password }),
    register: (data) =>
        api.post('/auth/register', data),
    me: () =>
        api.get('/auth/me'),
};

export const leadsApi = {
    list: (params) =>
        api.get('/leads', { params }),
    get: (id) =>
        api.get(`/leads/${id}`),
    create: (data) =>
        api.post('/leads', data),
    import: (file, mode) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('mode', mode);
        return api.post('/leads/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    getOptimalTime: (id) =>
        api.get(`/leads/${id}/optimal-time`),
};

export const callsApi = {
    log: (data) =>
        api.post('/calls', data),
    ghostSync: (data) =>
        api.post('/calls/ghost-sync', data),
    get: (id) =>
        api.get(`/calls/${id}`),
    updateDisposition: (id, data) =>
        api.put(`/calls/${id}/disposition`, data),
};

export const analyticsApi = {
    team: (period) =>
        api.get('/analytics/team', { params: { period } }),
    heatmap: () =>
        api.get('/analytics/heatmap'),
    warRoom: () =>
        api.get('/analytics/war-room'),
    rep: (id) =>
        api.get(`/analytics/rep/${id}`),
};

export const leaderboardApi = {
    top: (limit) =>
        api.get('/leaderboard/top', { params: { limit } }),
    rep: (id) =>
        api.get(`/leaderboard/rep/${id}`),
    history: (days) =>
        api.get('/leaderboard/history', { params: { days } }),
};

export const aiApi = {
    analyze: (callId, audioUrl) =>
        api.post('/ai/analyze', { callId, audioUrl }),
    battlecard: (objection, context) =>
        api.post('/ai/battlecard', { objection, context }),
    battlecards: () =>
        api.get('/ai/battlecards'),
};
