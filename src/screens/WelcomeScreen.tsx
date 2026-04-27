import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppSession } from '../context/AppSessionContext';
import { palette, radius, shadows, spacing } from '../theme/tokens';

export function WelcomeScreen() {
  const { authState, authError, signInWithPassword } = useAppSession();
  const [tenDangNhap, setTenDangNhap] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isBootstrapping = authState === 'loading';

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
          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Lưu ý hiện tại</Text>
          <Text style={styles.noteText}>
            App mobile đã nối đăng nhập thật bằng tài khoản `app.invaihn.vn` và đang đọc dữ liệu chat thật từ server. Luồng Google native cho khách hàng sẽ cần cấu hình OAuth client riêng cho Android/iOS trước khi bật.
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
