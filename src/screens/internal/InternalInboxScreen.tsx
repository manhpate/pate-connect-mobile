import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { ConversationRow } from '../../components/ConversationRow';
import { ScreenFrame } from '../../components/ScreenFrame';
import { useAppSession } from '../../context/AppSessionContext';
import { palette, radius, spacing } from '../../theme/tokens';
import { Channel, RootStackParamList } from '../../types/app';

const filters: Array<{ key: 'all' | Channel; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'website', label: 'Website' },
  { key: 'zalo', label: 'Zalo' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
];

export function InternalInboxScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    conversations,
    conversationPagination,
    loadConversationsUntilChannel,
    loadMoreConversations,
    markConversationRead,
    refreshConversations,
  } = useAppSession();
  const [activeFilter, setActiveFilter] = useState<'all' | Channel>('all');
  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [autoSearchDoneByFilter, setAutoSearchDoneByFilter] = useState<Partial<Record<Channel, boolean>>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      setLoading(true);
      setError('');
      try {
        await refreshConversations();
        if (!cancelled) {
          setAutoSearchDoneByFilter({});
        }
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

  const filteredConversations = useMemo(
    () =>
      activeFilter === 'all'
        ? conversations
        : conversations.filter((conversation) => conversation.channel === activeFilter),
    [activeFilter, conversations],
  );

  useEffect(() => {
    let cancelled = false;
    if (
      activeFilter !== 'all' &&
      filteredConversations.length === 0 &&
      conversationPagination.hasMore &&
      !conversationPagination.loadingMore &&
      !autoSearchDoneByFilter[activeFilter]
    ) {
      setAutoSearchDoneByFilter((prev) => ({ ...prev, [activeFilter]: true }));
      setFilterLoading(true);
      void loadConversationsUntilChannel(activeFilter)
        .catch((nextError) => {
          console.warn('Không tải thêm được hội thoại theo kênh:', nextError);
        })
        .finally(() => {
          if (!cancelled) {
            setFilterLoading(false);
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [
    activeFilter,
    autoSearchDoneByFilter,
    conversationPagination.hasMore,
    conversationPagination.loadingMore,
    filteredConversations.length,
    loadConversationsUntilChannel,
  ]);

  const renderFilters = (compact = false) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.filterRow, compact && styles.floatingFilterRow]}
    >
      {filters.map((filter) => (
        <Pressable
          key={filter.key}
          style={[
            styles.filterChip,
            compact && styles.filterChipFloating,
            activeFilter === filter.key ? styles.filterChipActive : styles.filterChipIdle,
          ]}
          onPress={() => {
            setError('');
            setActiveFilter(filter.key);
          }}
        >
          <Text
            style={[
              styles.filterText,
              compact && styles.filterTextFloating,
              activeFilter === filter.key ? styles.filterTextActive : styles.filterTextIdle,
            ]}
          >
            {filter.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  return (
    <ScreenFrame
      showScrollTop
      floatingButtonPosition="right"
      floatingAccessory={() => renderFilters(true)}
      onEndReached={() => {
        void loadMoreConversations().catch((nextError) => {
          console.warn('Không tải thêm được hội thoại:', nextError);
        });
      }}
    >
      {renderFilters()}

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
      {conversationPagination.loadingMore || filterLoading ? <ActivityIndicator color={palette.brand} /> : null}
      {!loading && !conversationPagination.loadingMore && !filterLoading && filteredConversations.length === 0 ? (
        <Text style={styles.emptyText}>Chưa có hội thoại trong mục này.</Text>
      ) : null}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  floatingFilterRow: {
    paddingRight: 0,
  },
  filterChip: {
    minHeight: 34,
    paddingHorizontal: 12,
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
  filterChipFloating: {
    minHeight: 30,
    paddingHorizontal: 10,
  },
  filterText: {
    fontWeight: '800',
    fontSize: 13,
  },
  filterTextFloating: {
    fontSize: 12,
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
  emptyText: {
    color: palette.textSoft,
    lineHeight: 22,
    textAlign: 'center',
  },
});
