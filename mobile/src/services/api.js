import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__
    ? 'http://10.0.2.2:3001/api/v1' // Android emulator
    : 'https://api.vocalpulse.io/api/v1';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Token management
api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            await AsyncStorage.removeItem('token');
        }
        return Promise.reject(error);
    }
);

// Auth
export const authApi = {
    login: (email, password) =>
        api.post('/auth/login', { email, password }),
    register: (data) =>
        api.post('/auth/register', data),
    me: () =>
        api.get('/auth/me'),
};

// Calls
export const callsApi = {
    log: (data) =>
        api.post('/calls', data),
    ghostSync: (data) =>
        api.post('/calls/ghost-sync', data),
};

// Leads
export const leadsApi = {
    list: (params) =>
        api.get('/leads', { params }),
    get: (id) =>
        api.get(`/leads/${id}`),
    getOptimalTime: (id) =>
        api.get(`/leads/${id}/optimal-time`),
};

// AI
export const aiApi = {
    battlecard: (objection) =>
        api.post('/ai/battlecard', { objection }),
};
