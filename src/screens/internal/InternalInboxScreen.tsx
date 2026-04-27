import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConversationRow } from '../../components/ConversationRow';
import { ScreenFrame } from '../../components/ScreenFrame';
import { useAppSession } from '../../context/AppSessionContext';
import { palette, radius, shadows, spacing } from '../../theme/tokens';
import { Channel, RootStackParamList } from '../../types/app';

const filters: Array<{ key: 'all' | Channel; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'website', label: 'Website' },
  { key: 'zalo', label: 'Zalo' },
  { key: 'facebook', label: 'Facebook' },
];

export function InternalInboxScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { conversations, markConversationRead, refreshConversations } = useAppSession();
  const [activeFilter, setActiveFilter] = useState<'all' | Channel>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      setLoading(true);
      setError('');
      try {
        await refreshConversations();
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Không tải được hội thoại');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [refreshConversations]);

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, conversation) => sum + conversation.unread, 0),
    [conversations],
  );

  const filteredConversations = useMemo(
    () =>
      activeFilter === 'all'
        ? conversations
        : conversations.filter((conversation) => conversation.channel === activeFilter),
    [activeFilter, conversations],
  );

  return (
    <ScreenFrame
      title="Hội thoại"
      subtitle="Inbox đa kênh cho đội nội bộ. Đây là phạm vi mobile v1 được ưu tiên trước website đầy đủ."
    >
      <View style={styles.metricsCard}>
        <View>
          <Text style={styles.metricsTitle}>Lead mới cần xử lý</Text>
          <Text style={styles.metricsValue}>{unreadTotal}</Text>
        </View>
        <View style={styles.metricsDivider} />
        <View>
          <Text style={styles.metricsTitle}>Kênh đang theo dõi</Text>
          <Text style={styles.metricsMeta}>Website • Zalo OA • Facebook Messenger</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {filters.map((filter) => (
          <Pressable
            key={filter.key}
            style={[
              styles.filterChip,
              activeFilter === filter.key ? styles.filterChipActive : styles.filterChipIdle,
            ]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === filter.key ? styles.filterTextActive : styles.filterTextIdle,
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? <ActivityIndicator color={palette.brand} /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {filteredConversations.map((conversation) => (
        <ConversationRow
          key={conversation.id}
          item={conversation}
          onPress={() => {
            void markConversationRead(conversation.id);
            navigation.navigate('Conversation', { conversationId: conversation.id });
          }}
        />
      ))}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  metricsCard: {
    backgroundColor: palette.dark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.card,
  },
  metricsTitle: {
    color: '#aab7cd',
    fontSize: 13,
    fontWeight: '700',
  },
  metricsValue: {
    color: palette.surface,
    fontSize: 28,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  metricsMeta: {
    color: palette.surface,
    marginTop: spacing.xs,
    lineHeight: 20,
    maxWidth: 180,
  },
  metricsDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#2d3645',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: palette.brand,
  },
  filterChipIdle: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  filterText: {
    fontWeight: '800',
  },
  filterTextActive: {
    color: palette.surface,
  },
  filterTextIdle: {
    color: palette.ink,
  },
  errorText: {
    color: palette.danger,
    lineHeight: 20,
  },
});
