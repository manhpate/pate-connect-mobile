import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppMessage, MessageAttachment } from '../types/app';
import { palette, radius, spacing } from '../theme/tokens';

const getAttachmentUrl = (attachment: MessageAttachment) => attachment.previewUrl || attachment.url || '';

const isImageAttachment = (attachment: MessageAttachment) => {
  const type = String(attachment.type || '').toLowerCase();
  const mimeType = String(attachment.mimeType || '').toLowerCase();
  const url = getAttachmentUrl(attachment).toLowerCase();
  return type === 'image' || mimeType.startsWith('image/') || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
};

const openAttachment = (attachment: MessageAttachment) => {
  const url = attachment.url || attachment.previewUrl || '';
  if (url) {
    void Linking.openURL(url);
  }
};

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
        {message.body ? <Text style={styles.body}>{message.body}</Text> : null}
        {message.attachments.length > 0 ? (
          <View style={styles.attachments}>
            {message.attachments.map((attachment, index) => {
              const url = getAttachmentUrl(attachment);
              if (url && isImageAttachment(attachment)) {
                return (
                  <Pressable
                    key={attachment.id || `${url}-${index}`}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={attachment.name || 'Mở ảnh'}
                    onPress={() => openAttachment(attachment)}
                  >
                    <Image source={{ uri: url }} style={styles.attachmentImage} resizeMode="cover" />
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={attachment.id || `${attachment.name || 'file'}-${index}`}
                  style={styles.fileAttachment}
                  onPress={() => openAttachment(attachment)}
                >
                  <Text style={styles.fileAttachmentText} numberOfLines={1}>
                    {attachment.name || 'Tệp đính kèm'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
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
  attachments: {
    gap: spacing.xs,
  },
  attachmentImage: {
    width: 220,
    height: 160,
    maxWidth: '100%',
    borderRadius: radius.sm,
    backgroundColor: palette.border,
  },
  fileAttachment: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.canvas,
    padding: spacing.sm,
  },
  fileAttachmentText: {
    color: palette.brandDark,
    fontWeight: '800',
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
