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
  previousMessage,
  currentUserName,
}: {
  message: AppMessage;
  previousMessage?: AppMessage | null;
  currentUserName: string;
}) {
  const isMine = message.authorName === currentUserName || message.authorType === 'me';
  const isSystem = message.authorType === 'system';
  const isAi = message.authorType === 'ai';
  const groupedWithPrevious = isMessageGroupedWithPrevious(message, previousMessage, currentUserName);
  const showTimeDivider = shouldShowTimeDivider(message, previousMessage);
  const showAvatar = !isMine && !isSystem && !groupedWithPrevious;

  if (isSystem) {
    return (
      <>
        {showTimeDivider ? (
          <View style={styles.timeDivider}>
            <Text style={styles.timeDividerText}>{formatTimeDivider(message)}</Text>
          </View>
        ) : null}
        <View style={styles.systemWrap}>
          <View style={styles.systemBubble}>
            <Text style={styles.systemText}>{message.body}</Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      {showTimeDivider ? (
        <View style={styles.timeDivider}>
          <Text style={styles.timeDividerText}>{formatTimeDivider(message)}</Text>
        </View>
      ) : null}
      <View style={[styles.messageRow, isMine ? styles.alignRight : styles.alignLeft]}>
        {!isMine ? (
          <View style={styles.avatarSlot}>
            {showAvatar ? (
              <View style={[styles.avatar, { backgroundColor: getAvatarColor(message.authorName) }]}>
                <Text style={styles.avatarText}>{getAvatarInitials(message.authorName)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <View
          style={[
            styles.bubble,
            isMine && styles.mineBubble,
            isAi && styles.aiBubble,
            !isMine && !isAi && styles.otherBubble,
          ]}
        >
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
      </View>
    </>
  );
}

const ONE_HOUR_MS = 60 * 60 * 1000;

const avatarColors = ['#2563eb', '#0f766e', '#c2410c', '#7c3aed', '#be123c', '#0369a1', '#4d7c0f', '#b45309'];

const parseMessageTime = (message?: AppMessage | null) => {
  if (!message?.sentAtRaw) return null;
  const time = new Date(message.sentAtRaw).getTime();
  return Number.isNaN(time) ? null : time;
};

const sameAuthor = (a: AppMessage, b: AppMessage, currentUserName: string) => {
  const aMine = a.authorName === currentUserName || a.authorType === 'me';
  const bMine = b.authorName === currentUserName || b.authorType === 'me';
  if (aMine !== bMine) return false;
  return a.authorType === b.authorType && a.authorName === b.authorName;
};

const isMessageGroupedWithPrevious = (
  message: AppMessage,
  previousMessage: AppMessage | null | undefined,
  currentUserName: string,
) => {
  if (!previousMessage || previousMessage.authorType === 'system' || message.authorType === 'system') return false;
  const currentTime = parseMessageTime(message);
  const previousTime = parseMessageTime(previousMessage);
  if (currentTime === null || previousTime === null) return false;
  return Math.abs(currentTime - previousTime) <= ONE_HOUR_MS && sameAuthor(message, previousMessage, currentUserName);
};

const shouldShowTimeDivider = (message: AppMessage, previousMessage?: AppMessage | null) => {
  if (!previousMessage) return true;
  const currentTime = parseMessageTime(message);
  const previousTime = parseMessageTime(previousMessage);
  if (currentTime === null || previousTime === null) return false;
  return Math.abs(currentTime - previousTime) > ONE_HOUR_MS;
};

const formatClock = (date: Date) =>
  new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatTimeDivider = (message: AppMessage) => {
  const time = parseMessageTime(message);
  if (time === null) return message.sentAt;

  const date = new Date(time);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) return `Hôm nay ${formatClock(date)}`;
  if (isSameDay(date, yesterday)) return `Hôm qua ${formatClock(date)}`;

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
};

const getAvatarInitials = (name: string) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';

  if (parts.length === 1) {
    const chars = Array.from(parts[0]);
    return `${chars[0] || ''}${chars.length > 1 ? chars[chars.length - 1] : ''}`.toLocaleUpperCase('vi-VN');
  }

  const first = Array.from(parts[0])[0] || '';
  const last = Array.from(parts[parts.length - 1])[0] || '';
  return `${first}${last}`.toLocaleUpperCase('vi-VN');
};

const getAvatarColor = (name: string) => {
  const chars = Array.from(String(name || ''));
  const hash = chars.reduce((value, char) => value * 31 + (char.codePointAt(0) || 0), 0);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const styles = StyleSheet.create({
  messageRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  alignLeft: {
    justifyContent: 'flex-start',
  },
  alignRight: {
    justifyContent: 'flex-end',
  },
  avatarSlot: {
    width: 32,
    alignItems: 'center',
    paddingTop: 2,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: palette.surface,
    fontSize: 11,
    fontWeight: '800',
  },
  bubble: {
    maxWidth: '82%',
    flexShrink: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  timeDivider: {
    alignItems: 'center',
    marginVertical: 2,
  },
  timeDividerText: {
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: '#b8bec8',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    fontSize: 12,
    color: palette.surface,
    fontWeight: '700',
  },
  systemWrap: {
    alignItems: 'center',
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
