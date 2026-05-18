import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { GroupRoom } from '../types/app';
import { palette, radius, spacing } from '../theme/tokens';
import { FileRow } from './FileRow';

export function FileVaultPanel({
  room,
  uploading = false,
  onBack,
  onUpload,
}: {
  room: GroupRoom;
  uploading?: boolean;
  onBack?: () => void;
  onUpload?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      {onBack || onUpload ? (
        <View style={styles.toolbar}>
          {onBack ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" style={styles.backButton} onPress={onBack}>
              <Ionicons name="arrow-back" size={20} color={palette.ink} />
            </Pressable>
          ) : null}
          <View style={styles.toolbarSpacer} />
          {onUpload ? (
            <Pressable
              style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
              disabled={uploading}
              onPress={onUpload}
            >
              <Ionicons name={uploading ? 'hourglass-outline' : 'add-circle-outline'} size={18} color={palette.surface} />
              <Text style={styles.uploadButtonText}>{uploading ? 'Đang upload' : 'Upload'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.list}>
        {room.files.map((file) => (
          <FileRow
            key={file.id}
            item={file}
            onPress={() => {
              if (file.downloadUrl) {
                void Linking.openURL(file.downloadUrl);
              }
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  toolbar: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarSpacer: {
    flex: 1,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: palette.sky,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 40,
  },
  uploadButtonText: {
    color: palette.surface,
    fontWeight: '800',
  },
  uploadButtonDisabled: {
    opacity: 0.65,
  },
  list: {
    gap: spacing.md,
  },
});
