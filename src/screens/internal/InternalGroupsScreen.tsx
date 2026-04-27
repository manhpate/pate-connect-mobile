import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenFrame } from '../../components/ScreenFrame';
import { useAppSession } from '../../context/AppSessionContext';
import { palette, radius, shadows, spacing } from '../../theme/tokens';
import { RootStackParamList } from '../../types/app';

export function InternalGroupsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { rooms, refreshRooms } = useAppSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      setLoading(true);
      setError('');
      try {
        await refreshRooms();
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Không tải được danh sách nhóm');
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
  }, [refreshRooms]);

  return (
    <ScreenFrame
      title="Nhóm chat"
      subtitle="Các nhóm đang hoạt động cho khách website và nhóm nội bộ vận hành."
    >
      {loading ? <ActivityIndicator color={palette.brand} /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {rooms.map((room) => (
        <Pressable
          key={room.id}
          style={styles.roomCard}
          onPress={() => navigation.navigate('GroupChat', { roomId: room.id })}
        >
          <View style={[styles.accentBar, { backgroundColor: room.accentColor }]} />
          <View style={styles.roomCopy}>
            <View style={styles.roomTitleRow}>
              <Text style={styles.roomTitle}>{room.name}</Text>
              {room.unread > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{room.unread}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.roomDescription}>{room.description}</Text>
            <Text style={styles.roomMeta}>
              {room.memberCount} thành viên • {room.unread} tin chưa đọc
            </Text>
          </View>
        </Pressable>
      ))}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  roomCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    flexDirection: 'row',
    ...shadows.card,
  },
  accentBar: {
    width: 8,
  },
  roomCopy: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  roomTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roomTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  unreadText: {
    color: palette.surface,
    fontSize: 12,
    fontWeight: '800',
  },
  roomDescription: {
    color: palette.textSoft,
    lineHeight: 20,
  },
  roomMeta: {
    color: palette.textMuted,
    fontSize: 12,
  },
  errorText: {
    color: palette.danger,
    lineHeight: 20,
  },
});
