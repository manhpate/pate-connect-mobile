import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppMessage } from '../types/app';
import { palette, radius, spacing } from '../theme/tokens';

export function MessageBubble({
  message,
  currentUserName,
}: {
  message: AppMessage;
  currentUserName: string;
}) {
  const isMine = message.authorName === currentUserName || message.authorType === 'me';
  const isSystem = message.authorType === 'system';
  const isAi = message.authorType === 'ai';

  if (isSystem) {
    return (
      <View style={styles.systemWrap}>
        <View style={styles.systemBubble}>
          <Text style={styles.systemText}>{message.body}</Text>
        </View>
        <Text style={styles.timeStamp}>{message.sentAt}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, isMine ? styles.alignRight : styles.alignLeft]}>
      <View
        style={[
          styles.bubble,
          isMine && styles.mineBubble,
          isAi && styles.aiBubble,
          !isMine && !isAi && styles.otherBubble,
        ]}
      >
        <Text style={styles.author}>{message.authorName}</Text>
        <Text style={styles.body}>{message.body}</Text>
      </View>
      <Text style={styles.timeStamp}>{message.sentAt}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  alignLeft: {
    alignItems: 'flex-start',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  mineBubble: {
    backgroundColor: palette.skySoft,
  },
  aiBubble: {
    backgroundColor: palette.accentSoft,
  },
  otherBubble: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  author: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.brandDark,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.ink,
  },
  timeStamp: {
    fontSize: 12,
    color: palette.textMuted,
  },
  systemWrap: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  systemBubble: {
    backgroundColor: '#eef3ff',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  systemText: {
    color: palette.ink,
    textAlign: 'center',
    lineHeight: 20,
  },
});
