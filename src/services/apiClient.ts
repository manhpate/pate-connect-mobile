import axios from 'axios';

import { APP_API_BASE_URL } from '../config/appConfig';

let accessToken = '';

export const apiClient = axios.create({
  baseURL: APP_API_BASE_URL,
  timeout: 20000,
});

export const setApiAccessToken = (token = '') => {
  accessToken = String(token || '').trim();
};

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error?.response?.data || { EM: 'Không kết nối được máy chủ', EC: -1, DT: null }),
);
