import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GroupRoom } from '../types/app';
import { palette, radius, spacing } from '../theme/tokens';
import { ChatComposer } from './ChatComposer';
import { MessageBubble } from './MessageBubble';

interface GroupChatPanelProps {
  room: GroupRoom;
  currentUserName: string;
  onSend: (body: string) => void;
  onBack?: () => void;
  onOpenInfo: () => void;
  onOpenFiles: () => void;
}

export function GroupChatPanel({
  room,
  currentUserName,
  onSend,
  onBack,
  onOpenInfo,
  onOpenFiles,
}: GroupChatPanelProps) {
  const [draft, setDraft] = useState('');
  const onlineCount = useMemo(() => room.members.filter((member) => member.online).length, [room.members]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          {onBack ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" style={styles.backButton} onPress={onBack}>
              <Ionicons name="arrow-back" size={20} color={palette.ink} />
            </Pressable>
          ) : null}
          <View style={styles.headerCopy}>
            <Text style={styles.roomName}>{room.name}</Text>
            <Text style={styles.roomMeta}>
              {room.members.length} thành viên • {onlineCount} đang online
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, styles.actionYellow]}
            onPress={() =>
              Alert.alert(
                'Mời email',
                'Luồng mời email trên mobile sẽ được nối tiếp. Dữ liệu nhóm chat hiện đã dùng trực tiếp từ app.invaihn.vn.',
              )
            }
          >
            <Ionicons name="person-add-outline" size={18} color={palette.ink} />
            <Text style={styles.actionText}>Mời</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.actionGreen]} onPress={onOpenFiles}>
            <Ionicons name="cloud-upload-outline" size={18} color={palette.surface} />
            <Text style={[styles.actionText, styles.actionTextLight]}>File</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.actionYellow]} onPress={onOpenInfo}>
            <Ionicons name="ellipsis-vertical" size={18} color={palette.ink} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
        {room.messages.map((message) => (
          <MessageBubble key={message.id} message={message} currentUserName={currentUserName} />
        ))}
      </ScrollView>

      <ChatComposer
        value={draft}
        onChangeText={setDraft}
        onSend={() => {
          if (!draft.trim()) {
            return;
          }
          onSend(draft);
          setDraft('');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  headerCard: {
    margin: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.canvas,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  roomName: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.ink,
  },
  roomMeta: {
    color: palette.textSoft,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  actionButton: {
    minHeight: 44,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionYellow: {
    backgroundColor: palette.accent,
  },
  actionGreen: {
    backgroundColor: palette.brand,
  },
  actionText: {
    fontWeight: '800',
    color: palette.ink,
  },
  actionTextLight: {
    color: palette.surface,
  },
  messages: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
});
