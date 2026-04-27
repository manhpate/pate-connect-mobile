import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { GroupRoom } from '../types/app';
import { palette, radius, spacing } from '../theme/tokens';
import { FileRow } from './FileRow';

export function FileVaultPanel({ room }: { room: GroupRoom }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.title}>Kho file của nhóm</Text>
          <Text style={styles.subtitle}>
            File thiết kế, ảnh mẫu và tài liệu chốt đơn của nhóm này sẽ tập trung tại một nơi.
          </Text>
        </View>
        <Pressable
          style={styles.uploadButton}
          onPress={() =>
            Alert.alert(
              'Upload file',
              'Danh sách file hiện đã lấy từ dữ liệu thật của nhóm. Nút upload file native sẽ được nối ở bước tiếp theo.',
            )
          }
        >
          <Ionicons name="add-circle-outline" size={18} color={palette.surface} />
          <Text style={styles.uploadButtonText}>Upload</Text>
        </Pressable>
      </View>

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
    padding: spacing.lg,
    gap: spacing.md,
  },
  hero: {
    backgroundColor: palette.dark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroCopy: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.surface,
  },
  subtitle: {
    color: '#d8dfeb',
    lineHeight: 20,
  },
  uploadButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: palette.sky,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  uploadButtonText: {
    color: palette.surface,
    fontWeight: '800',
  },
  list: {
    gap: spacing.md,
  },
});
