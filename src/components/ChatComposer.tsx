import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { palette, radius, spacing } from '../theme/tokens';
import { UploadImageFile } from '../types/app';

interface ChatComposerProps {
  value: string;
  onChangeText: (nextValue: string) => void;
  onSend: () => void;
  onPickImage?: () => void;
  selectedImage?: UploadImageFile | null;
  onRemoveImage?: () => void;
  sending?: boolean;
  placeholder?: string;
}

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  onPickImage,
  selectedImage,
  onRemoveImage,
  sending = false,
  placeholder = 'Nhập nội dung trả lời...',
}: ChatComposerProps) {
  const canSend = Boolean(value.trim() || selectedImage) && !sending;

  return (
    <View style={styles.outerWrap}>
      {selectedImage ? (
        <View style={styles.previewRow}>
          <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
          <View style={styles.previewCopy}>
            <Text style={styles.previewName} numberOfLines={1}>{selectedImage.name}</Text>
            {selectedImage.sizeBytes ? (
              <Text style={styles.previewMeta}>{(selectedImage.sizeBytes / 1024 / 1024).toFixed(2)} MB</Text>
            ) : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Bỏ ảnh" style={styles.removeButton} onPress={onRemoveImage}>
            <Ionicons name="close" size={18} color={palette.ink} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.wrap}>
        {onPickImage ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Chọn ảnh" style={styles.attachButton} onPress={onPickImage} disabled={sending}>
            <Ionicons name="image-outline" size={22} color={palette.brandDark} />
          </Pressable>
        ) : null}
        <TextInput
          multiline
          value={value}
          onChangeText={onChangeText}
          placeholder={selectedImage ? 'Có thể nhập thêm mô tả cho ảnh...' : placeholder}
          placeholderTextColor={palette.textMuted}
          style={styles.input}
          editable={!sending}
        />
        <Pressable style={[styles.sendButton, !canSend && styles.sendButtonDisabled]} onPress={onSend} disabled={!canSend}>
          <Ionicons name={sending ? 'hourglass-outline' : 'paper-plane'} size={20} color={palette.surface} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.surface,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
  },
  previewRow: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.canvas,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewImage: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: palette.border,
  },
  previewCopy: {
    flex: 1,
    gap: 2,
  },
  previewName: {
    color: palette.ink,
    fontWeight: '800',
  },
  previewMeta: {
    color: palette.textSoft,
    fontSize: 12,
  },
  removeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachButton: {
    width: 46,
    height: 54,
    borderRadius: 16,
    backgroundColor: palette.brandSoft,
    borderWidth: 1,
    borderColor: '#bceadf',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 54,
    maxHeight: 130,
    borderRadius: radius.md,
    backgroundColor: palette.canvas,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  sendButton: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: palette.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
