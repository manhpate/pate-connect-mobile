import {
  GoogleAuthProvider,
  User,
  signInWithCredential,
  signInWithCustomToken,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

import { firebaseAuth } from '../config/firebaseApp';

export interface FirebaseGoogleProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({ prompt: 'select_account' });

const profileFromFirebaseUser = (user: User): FirebaseGoogleProfile => {
  const email = String(user.email || '').trim();
  if (!email) {
    throw new Error('Tài khoản Google chưa có email để đăng nhập hệ thống.');
  }

  return {
    uid: user.uid,
    email,
    displayName: String(user.displayName || email),
    photoURL: user.photoURL || '',
  };
};

export const signInFirebaseWithGooglePopup = async () => {
  const result = await signInWithPopup(firebaseAuth, googleProvider);
  return profileFromFirebaseUser(result.user);
};

export const signInFirebaseWithGoogleToken = async ({
  accessToken,
  idToken,
}: {
  accessToken?: string;
  idToken?: string;
}) => {
  if (!accessToken && !idToken) {
    throw new Error('Google không trả về token để đăng nhập Firebase.');
  }

  const credential = GoogleAuthProvider.credential(idToken || undefined, accessToken || undefined);
  const result = await signInWithCredential(firebaseAuth, credential);
  return profileFromFirebaseUser(result.user);
};

export const signInFirebaseWithBackendToken = async (customToken?: string) => {
  const token = String(customToken || '').trim();
  if (!token) return;

  await signInWithCustomToken(firebaseAuth, token);
};

export const signOutFirebase = async () => {
  await signOut(firebaseAuth);
};
