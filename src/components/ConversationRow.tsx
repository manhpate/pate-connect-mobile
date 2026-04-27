import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConversationSummary } from '../types/app';
import { palette, radius, shadows, spacing } from '../theme/tokens';

const channelLabel = {
  website: 'Website',
  zalo: 'Zalo OA',
  facebook: 'Facebook',
};

const channelColor = {
  website: palette.brand,
  zalo: '#2563eb',
  facebook: '#3556d1',
};

export function ConversationRow({
  item,
  onPress,
}: {
  item: ConversationSummary;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.avatar}>
        <Ionicons name="chatbubbles-outline" size={20} color={palette.brandDark} />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{item.customerName}</Text>
          <Text style={styles.time}>{item.lastMessageAt}</Text>
        </View>
        <View style={styles.metaRow}>
          <View style={[styles.channelPill, { backgroundColor: `${channelColor[item.channel]}18` }]}>
            <Text style={[styles.channelText, { color: channelColor[item.channel] }]}>
              {channelLabel[item.channel]}
            </Text>
          </View>
          {item.unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unread}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.preview} numberOfLines={2}>
          {item.preview}
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: palette.ink,
  },
  time: {
    color: palette.textMuted,
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  channelPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  channelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  badgeText: {
    color: palette.surface,
    fontWeight: '800',
    fontSize: 12,
  },
  preview: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
});
