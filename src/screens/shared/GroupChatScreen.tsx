import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { GroupChatPanel } from '../../components/GroupChatPanel';
import { useAppSession } from '../../context/AppSessionContext';
import { palette, spacing } from '../../theme/tokens';
import { GroupRoom } from '../../types/app';
import { RootStackParamList } from '../../types/app';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupChat'>;

export function GroupChatScreen({ navigation, route }: Props) {
  const { currentUser, loadRoomDetail, sendRoomMessage, markRoomRead } = useAppSession();
  const [room, setRoom] = useState<GroupRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      setLoading(true);
      setError('');
      try {
        const detail = await loadRoomDetail(route.params.roomId);
        if (!cancelled) {
          setRoom(detail);
          if (detail?.unread) {
            await markRoomRead(detail.id);
          }
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Không tải được nhóm chat');
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
  }, [loadRoomDetail, markRoomRead, route.params.roomId]);

  if (!currentUser) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={palette.brand} />
      </View>
    );
  }

  if (!room) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Không tìm thấy nhóm chat.'}</Text>
      </View>
    );
  }

  return (
    <GroupChatPanel
      room={room}
      currentUserName={currentUser.username}
      onSend={async (body) => {
        try {
          const message = await sendRoomMessage(room.id, body);
          if (!message) return;
          setRoom((prev) => (prev ? { ...prev, unread: 0, messages: [...prev.messages, message] } : prev));
        } catch (nextError) {
          Alert.alert('Gửi tin nhắn thất bại', nextError instanceof Error ? nextError.message : 'Không gửi được tin nhắn.');
        }
      }}
      onOpenFiles={() => navigation.navigate('FileVault', { roomId: room.id })}
      onOpenInfo={() => navigation.navigate('GroupInfo', { roomId: room.id })}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  errorText: {
    color: palette.danger,
    textAlign: 'center',
    lineHeight: 22,
  },
});
