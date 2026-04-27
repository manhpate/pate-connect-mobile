import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenFrame } from '../../components/ScreenFrame';
import { useAppSession } from '../../context/AppSessionContext';
import { palette, radius, shadows, spacing } from '../../theme/tokens';

export function ProfileScreen() {
  const { currentUser, signOut } = useAppSession();

  if (!currentUser) {
    return null;
  }

  return (
    <ScreenFrame
      title="Tài khoản"
      subtitle="Phân quyền vẫn lấy từ backend. Mobile chỉ hiển thị theo đúng phạm vi user được cấp."
      headerAction={
        <Text onPress={signOut} style={styles.logout}>
          Đăng xuất
        </Text>
      }
    >
      <View style={styles.profileCard}>
        <Text style={styles.name}>{currentUser.username}</Text>
        <Text style={styles.meta}>
          {currentUser.roleLabel} • {currentUser.email}
        </Text>
        <View style={styles.pills}>
          {currentUser.permissions.map((permission) => (
            <View key={permission} style={styles.permissionPill}>
              <Text style={styles.permissionText}>{permission}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Hướng mở rộng sau v1</Text>
        <Text style={styles.noteText}>
          Nội bộ sẽ mở rộng dần theo module đáng lên mobile. Khách hàng tiếp tục chỉ tập trung vào chat nhóm,
          file và thông báo.
        </Text>
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  logout: {
    color: palette.surface,
    fontWeight: '800',
  },
  profileCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    color: palette.ink,
  },
  meta: {
    color: palette.textSoft,
    lineHeight: 22,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  permissionPill: {
    backgroundColor: palette.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  permissionText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  noteCard: {
    backgroundColor: palette.brandSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#bceadf',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.ink,
  },
  noteText: {
    lineHeight: 22,
    color: palette.ink,
  },
});
