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
    <ScreenFrame>
      <View style={styles.actionRow}>
        <Text onPress={signOut} style={styles.logout}>
          Đăng xuất
        </Text>
      </View>

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
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    alignItems: 'flex-end',
  },
  logout: {
    color: palette.brandDark,
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
});
