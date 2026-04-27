import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { palette, radius, spacing } from '../theme/tokens';

interface ChatComposerProps {
  value: string;
  onChangeText: (nextValue: string) => void;
  onSend: () => void;
  placeholder?: string;
}

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  placeholder = 'Nhập nội dung trả lời...',
}: ChatComposerProps) {
  return (
    <View style={styles.wrap}>
      <TextInput
        multiline
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        style={styles.input}
      />
      <Pressable style={styles.sendButton} onPress={onSend}>
        <Ionicons name="paper-plane" size={20} color={palette.surface} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.surface,
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
});
