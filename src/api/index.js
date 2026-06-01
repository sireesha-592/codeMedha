// src/api/index.js
// Converted from web: src/api.js
// localStorage → AsyncStorage, axios interceptors preserved

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE = 'https://codemedha-production-47c1.up.railway.app';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// Request interceptor — attach token based on user role stored in AsyncStorage
api.interceptors.request.use(async (config) => {
  try {
    const role = await AsyncStorage.getItem('lms_role');
    let token;
    if (role === 'admin') {
      token = await AsyncStorage.getItem('lms_token_admin');
    } else if (role === 'trainer' || role === 'teacher') {
      token = await AsyncStorage.getItem('lms_token_trainer');
    } else {
      token = await AsyncStorage.getItem('lms_token_student');
    }
    if (!token) token = await AsyncStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (e) {}
  return config;
});

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired — clear storage (AuthContext will redirect to login)
      await AsyncStorage.multiRemove([
        'lms_token_student', 'lms_token_trainer', 'lms_token_admin',
        'lms_user_student', 'lms_user_trainer', 'lms_user_admin',
        'token', 'user', 'lms_role',
      ]);
    }
    return Promise.reject(error);
  }
);

export default api;
