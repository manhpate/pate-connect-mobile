import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GroupFile } from '../types/app';
import { palette, radius, shadows, spacing } from '../theme/tokens';

const iconByKind = {
  image: 'image-outline',
  design: 'color-palette-outline',
  document: 'document-text-outline',
} as const;

export function FileRow({ item, onPress }: { item: GroupFile; onPress?: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconByKind[item.kind]} size={20} color={palette.brandDark} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {item.sizeLabel} • {item.uploadedBy} • {item.uploadedAt}
        </Text>
      </View>
      <View style={[styles.status, item.status === 'ready' ? styles.ready : styles.uploading]}>
        <Text style={[styles.statusText, item.status === 'ready' ? styles.readyText : styles.uploadingText]}>
          {item.status === 'ready' ? 'Mở file' : 'Đang upload'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.card,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.ink,
  },
  meta: {
    fontSize: 12,
    color: palette.textMuted,
  },
  status: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  ready: {
    backgroundColor: palette.successSoft,
  },
  uploading: {
    backgroundColor: palette.skySoft,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  readyText: {
    color: palette.success,
  },
  uploadingText: {
    color: palette.sky,
  },
});
