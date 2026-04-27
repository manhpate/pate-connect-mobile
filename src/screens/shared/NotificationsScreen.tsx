import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenFrame } from '../../components/ScreenFrame';
import { useAppSession } from '../../context/AppSessionContext';
import { palette, radius, shadows, spacing } from '../../theme/tokens';

export function NotificationsScreen() {
  const {
    notifications,
    currentUser,
    markAllNotificationsRead,
    markNotificationRead,
    refreshNotifications,
  } = useAppSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const visibleNotifications = useMemo(
    () => notifications.filter((item) => item.scope === 'all' || item.scope === currentUser?.mode),
    [currentUser?.mode, notifications],
  );

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      if (!currentUser?.canUseNotifications) return;
      setLoading(true);
      setError('');
      try {
        await refreshNotifications();
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Không tải được thông báo');
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
  }, [currentUser?.canUseNotifications, refreshNotifications]);

  return (
    <ScreenFrame
      title="Thông báo"
      subtitle="Push và badge theo đúng phạm vi quyền của người dùng trên mobile."
      headerAction={
        currentUser?.canUseNotifications ? (
          <Text onPress={() => void markAllNotificationsRead()} style={styles.headerAction}>
            Đọc hết
          </Text>
        ) : undefined
      }
    >
      {loading ? <ActivityIndicator color={palette.brand} /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {visibleNotifications.map((item) => (
        <Pressable key={item.id} style={styles.card} onPress={() => void markNotificationRead(item.id)}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.time}>{item.timestamp}</Text>
          </View>
          <Text style={styles.body}>{item.body}</Text>
          <View style={[styles.statePill, item.read ? styles.readPill : styles.unreadPill]}>
            <Text style={[styles.stateText, item.read ? styles.readText : styles.unreadText]}>
              {item.read ? 'Đã đọc' : 'Mới'}
            </Text>
          </View>
        </Pressable>
      ))}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    color: palette.surface,
    fontWeight: '800',
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.sm,
    ...shadows.card,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: palette.ink,
  },
  time: {
    color: palette.textMuted,
    fontSize: 12,
  },
  body: {
    color: palette.textSoft,
    lineHeight: 22,
  },
  statePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  unreadPill: {
    backgroundColor: palette.accentSoft,
  },
  readPill: {
    backgroundColor: palette.surfaceAlt,
  },
  stateText: {
    fontWeight: '800',
    fontSize: 12,
  },
  unreadText: {
    color: '#9a6f00',
  },
  readText: {
    color: palette.textSoft,
  },
  errorText: {
    color: palette.danger,
    lineHeight: 20,
  },
});
