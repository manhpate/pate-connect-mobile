import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, initializeAuth } from 'firebase/auth';
import { Platform } from 'react-native';

const env = process.env as Record<string, string | undefined>;

const readEnv = (key: string, fallback: string) => String(env[key] || fallback).trim();

export const firebaseConfig = {
  apiKey: readEnv('EXPO_PUBLIC_FIREBASE_API_KEY', 'AIzaSyBeAayBKm4QqRvrS6g3PNH98xB5TQSacgs'),
  authDomain: readEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'app-pate.firebaseapp.com'),
  databaseURL: readEnv(
    'EXPO_PUBLIC_FIREBASE_DATABASE_URL',
    'https://app-pate-default-rtdb.asia-southeast1.firebasedatabase.app',
  ),
  projectId: readEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'app-pate'),
  storageBucket: readEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'app-pate.firebasestorage.app'),
  messagingSenderId: readEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '1001728301885'),
  appId: readEnv('EXPO_PUBLIC_FIREBASE_APP_ID', '1:1001728301885:web:40cf112170826723e34354'),
  measurementId: readEnv('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID', 'G-B7L665BR5K'),
};

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const createFirebaseAuth = () => {
  if (Platform.OS === 'web') {
    return getAuth(firebaseApp);
  }

  try {
    return initializeAuth(firebaseApp, {
      persistence: inMemoryPersistence,
    });
  } catch {
    return getAuth(firebaseApp);
  }
};

export const firebaseAuth = createFirebaseAuth();
