import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__
    ? 'http://10.0.2.2:3001/api' // Android emulator
    : 'https://api.vocalpulse.io/api';

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
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    register: (data: any) =>
        api.post('/auth/register', data),
    me: () =>
        api.get('/auth/me'),
};

// Calls
export const callsApi = {
    log: (data: any) =>
        api.post('/calls', data),
    ghostSync: (data: {
        phoneNumber: string;
        startedAt: string;
        endedAt: string;
        durationSeconds: number;
        callType: 'outbound' | 'inbound';
    }) =>
        api.post('/calls/ghost-sync', data),
};

// Leads
export const leadsApi = {
    list: (params?: any) =>
        api.get('/leads', { params }),
    get: (id: string) =>
        api.get(`/leads/${id}`),
    getOptimalTime: (id: string) =>
        api.get(`/leads/${id}/optimal-time`),
};

// AI
export const aiApi = {
    battlecard: (objection: string) =>
        api.post('/ai/battlecard', { objection }),
};
