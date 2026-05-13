import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
} from '../config/googleAuth';
import { useAppSession } from '../context/AppSessionContext';
import { signInFirebaseWithGooglePopup, signInFirebaseWithGoogleToken } from '../services/firebaseAuth';
import { palette, radius, shadows, spacing } from '../theme/tokens';

WebBrowser.maybeCompleteAuthSession();

export function WelcomeScreen() {
  const { authState, authError, signInWithGoogleProfile, signInWithPassword } = useAppSession();
  const [tenDangNhap, setTenDangNhap] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const isBootstrapping = authState === 'loading';
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
    selectAccount: true,
  });
  const isGoogleDisabled = (Platform.OS !== 'web' && !request) || googleSubmitting || isBootstrapping;

  const xuLyDangNhap = async () => {
    if (!tenDangNhap.trim() || !password.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await signInWithPassword(tenDangNhap, password);
    } finally {
      setSubmitting(false);
    }
  };

  const googleErrorText = useMemo(() => {
    if (googleError) return googleError;
    if (!response || response.type !== 'error') return '';
    return response.error?.message || 'Đăng nhập Google thất bại.';
  }, [googleError, response]);

  useEffect(() => {
    if (!response || response.type !== 'success') {
      return;
    }

    if (Platform.OS === 'web') {
      return;
    }

    const accessToken = response.authentication?.accessToken;
    const idToken = response.authentication?.idToken || response.params?.id_token;
    if (!accessToken && !idToken) {
      setGoogleSubmitting(false);
      setGoogleError('Google không trả token đăng nhập.');
      return;
    }

    let cancelled = false;
    const loginGoogle = async () => {
      try {
        setGoogleError('');
        const profile = await signInFirebaseWithGoogleToken({
          accessToken,
          idToken,
        });

        if (cancelled) return;

        await signInWithGoogleProfile({
          uid: profile.uid,
          email: profile.email,
          displayName: profile.displayName,
          photoURL: profile.photoURL || '',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Đăng nhập Google thất bại.';
        setGoogleError(message);
        console.warn('Đăng nhập Google Firebase thất bại:', error);
      } finally {
        if (!cancelled) {
          setGoogleSubmitting(false);
        }
      }
    };

    void loginGoogle();

    return () => {
      cancelled = true;
    };
  }, [response, signInWithGoogleProfile]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.hero}>
        <View style={styles.logoPill}>
          <Text style={styles.logoText}>PATE</Text>
        </View>
        <Text style={styles.title}>Pate Connect</Text>
        <Text style={styles.subtitle}>
          App mobile dùng trực tiếp dữ liệu thật từ `app.invaihn.vn` cho chat nhóm, hội thoại đa kênh và thông báo.
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Đăng nhập tài khoản app</Text>
          <TextInput
            value={tenDangNhap}
            onChangeText={setTenDangNhap}
            placeholder="Số điện thoại hoặc email"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            autoCapitalize="none"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mật khẩu"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            secureTextEntry
          />
          <Pressable
            style={[styles.loginButton, (!tenDangNhap.trim() || !password.trim() || submitting || isBootstrapping) && styles.buttonDisabled]}
            disabled={!tenDangNhap.trim() || !password.trim() || submitting || isBootstrapping}
            onPress={xuLyDangNhap}
          >
            {submitting || isBootstrapping ? (
              <ActivityIndicator color={palette.surface} />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={18} color={palette.surface} />
                <Text style={styles.loginButtonText}>Đăng nhập</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={[styles.googleButton, isGoogleDisabled && styles.buttonDisabled]}
            disabled={isGoogleDisabled}
            onPress={async () => {
              setGoogleSubmitting(true);
              setGoogleError('');
              try {
                if (Platform.OS === 'web') {
                  const profile = await signInFirebaseWithGooglePopup();
                  await signInWithGoogleProfile(profile);
                  return;
                }

                const result = await promptAsync();
                if (result.type !== 'success') {
                  setGoogleSubmitting(false);
                }
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Không mở được luồng Google Sign-In.';
                setGoogleError(message);
                console.warn('Không mở được luồng Google Sign-In:', error);
                setGoogleSubmitting(false);
              } finally {
                if (Platform.OS === 'web') {
                  setGoogleSubmitting(false);
                }
              }
            }}
          >
            {googleSubmitting ? (
              <ActivityIndicator color={palette.ink} />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color={palette.ink} />
                <Text style={styles.googleButtonText}>Đăng nhập Google</Text>
              </>
            )}
          </Pressable>
          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
          {googleErrorText ? <Text style={styles.errorText}>{googleErrorText}</Text> : null}
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Lưu ý hiện tại</Text>
          <Text style={styles.noteText}>
            App mobile đã nối đăng nhập thật bằng tài khoản app và đã bật luồng Google sign-in cho Firebase project hiện tại. Nếu Android production cần ổn định hoàn toàn, bạn nên bổ sung SHA-1/SHA-256 cho app Android trong Firebase để sinh Android OAuth client riêng.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  hero: {
    backgroundColor: palette.dark,
    padding: spacing.xl,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    gap: spacing.md,
  },
  logoPill: {
    alignSelf: 'flex-start',
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  logoText: {
    color: palette.brandDark,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: palette.surface,
  },
  subtitle: {
    color: '#d3d9e4',
    lineHeight: 22,
    fontSize: 15,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  formCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: palette.canvas,
    paddingHorizontal: spacing.md,
    color: palette.ink,
    fontSize: 15,
  },
  loginButton: {
    minHeight: 50,
    borderRadius: radius.pill,
    backgroundColor: palette.brand,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flexDirection: 'row',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: palette.surface,
    fontWeight: '800',
    fontSize: 15,
  },
  googleButton: {
    minHeight: 50,
    borderRadius: radius.pill,
    backgroundColor: '#f6f7fb',
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flexDirection: 'row',
  },
  googleButtonText: {
    color: palette.ink,
    fontWeight: '800',
    fontSize: 15,
  },
  errorText: {
    color: palette.danger,
    lineHeight: 20,
  },
  noteCard: {
    backgroundColor: palette.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#f4df95',
  },
  noteTitle: {
    fontWeight: '800',
    color: palette.ink,
  },
  noteText: {
    color: palette.ink,
    lineHeight: 22,
  },
});
