import { Platform } from 'react-native';

const defaultApiBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8080';
    }
  }

  return 'https://app.invaihn.vn';
};

export const APP_API_BASE_URL =
  String(process.env.EXPO_PUBLIC_APP_API_BASE_URL || '').trim() || defaultApiBaseUrl();

export const AUTH_TOKEN_STORAGE_KEY = 'pate_connect_mobile_access_token';
