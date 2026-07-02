import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { GroupChatPanel } from '../../components/GroupChatPanel';
import { ScreenFrame } from '../../components/ScreenFrame';
import { useAppSession } from '../../context/AppSessionContext';
import { palette, spacing } from '../../theme/tokens';
import { GroupRoom } from '../../types/app';
import { RootStackParamList } from '../../types/app';
import { mergeMessagesChronologically } from '../../utils/messageMerge';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupChat'>;

export function GroupChatScreen({ navigation, route }: Props) {
  const {
    currentUser,
    rooms,
    loadRoomDetail,
    sendRoomMessage,
    sendRoomImage,
    markRoomRead,
  } = useAppSession();
  const roomSnapshot = useMemo(
    () => rooms.find((item) => item.id === route.params.roomId) || null,
    [rooms, route.params.roomId],
  );
  const [room, setRoom] = useState<GroupRoom | null>(roomSnapshot);
  const [loading, setLoading] = useState(!roomSnapshot);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setRoom((prev) => {
      if (prev?.id === route.params.roomId && roomSnapshot) {
        return {
          ...prev,
          ...roomSnapshot,
          files: prev.files.length ? prev.files : roomSnapshot.files,
          members: roomSnapshot.members.length ? roomSnapshot.members : prev.members,
          messages: prev.messages.length ? prev.messages : roomSnapshot.messages,
          hasMoreBefore: prev.hasMoreBefore || roomSnapshot.hasMoreBefore,
          nextBeforeMessageId: prev.nextBeforeMessageId || roomSnapshot.nextBeforeMessageId,
          canManageMembers: prev.canManageMembers || roomSnapshot.canManageMembers,
          canEditRoom: prev.canEditRoom || roomSnapshot.canEditRoom,
          canRemoveMembers: prev.canRemoveMembers || roomSnapshot.canRemoveMembers,
        };
      }
      if (prev?.id === route.params.roomId) return prev;
      return roomSnapshot;
    });
  }, [roomSnapshot, route.params.roomId]);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      setLoading(!roomSnapshot);
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

  if (loading && !room) {
    return (
      <ScreenFrame scroll={false}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.brand} />
        </View>
      </ScreenFrame>
    );
  }

  if (!room) {
    return (
      <ScreenFrame scroll={false}>
        <View style={styles.errorWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={palette.ink} />
          </Pressable>
          <Text style={styles.errorText}>{error || 'Không tìm thấy nhóm chat.'}</Text>
        </View>
      </ScreenFrame>
    );
  }

  const handleLoadOlder = async () => {
    if (!room.hasMoreBefore || !room.nextBeforeMessageId || loadingOlder) {
      return;
    }

    setLoadingOlder(true);
    try {
      const olderPage = await loadRoomDetail(room.id, { beforeMessageId: room.nextBeforeMessageId });
      if (!olderPage) return;
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              ...olderPage,
              files: prev.files.length ? prev.files : olderPage.files,
              members: olderPage.members.length ? olderPage.members : prev.members,
              messages: mergeMessagesChronologically(olderPage.messages, prev.messages),
            }
          : olderPage,
      );
    } catch (nextError) {
      console.warn('Không tải thêm lịch sử nhóm chat:', nextError);
    } finally {
      setLoadingOlder(false);
    }
  };

  return (
    <GroupChatPanel
      room={room}
      currentUserName={currentUser.username}
      onSend={async (body, image) => {
        const message = image
          ? await sendRoomImage(room.id, body, image)
          : await sendRoomMessage(room.id, body);
        if (!message) return;
        setRoom((prev) => (prev ? { ...prev, unread: 0, messages: [...prev.messages, message] } : prev));
      }}
      onBack={() => navigation.goBack()}
      onOpenFiles={() => navigation.navigate('FileVault', { roomId: room.id })}
      onOpenInfo={() => navigation.navigate('GroupInfo', { roomId: room.id })}
      loadingOlder={loadingOlder}
      onLoadOlder={handleLoadOlder}
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
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
