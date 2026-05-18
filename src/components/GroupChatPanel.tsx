import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GroupRoom, UploadImageFile } from '../types/app';
import { palette, radius, spacing } from '../theme/tokens';
import { pickChatImage } from '../utils/chatImagePicker';
import { ChatComposer } from './ChatComposer';
import { MessageBubble } from './MessageBubble';

interface GroupChatPanelProps {
  room: GroupRoom;
  currentUserName: string;
  onSend: (body: string, image?: UploadImageFile) => Promise<void> | void;
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
  const [selectedImage, setSelectedImage] = useState<UploadImageFile | null>(null);
  const [sending, setSending] = useState(false);
  const memberCount = room.memberCount || room.members.length;
  const onlineCount = useMemo(() => room.members.filter((member) => member.online).length, [room.members]);

  const handlePickImage = async () => {
    try {
      const result = await pickChatImage();
      if (result.error) {
        Alert.alert('Không chọn được ảnh', result.error);
        return;
      }
      if (result.image) {
        setSelectedImage(result.image);
      }
    } catch (error) {
      Alert.alert('Không chọn được ảnh', error instanceof Error ? error.message : 'Không mở được thư viện ảnh.');
    }
  };

  const handleSend = async () => {
    if (!draft.trim() && !selectedImage) {
      return;
    }

    setSending(true);
    try {
      await onSend(draft, selectedImage || undefined);
      setDraft('');
      setSelectedImage(null);
    } catch (error) {
      Alert.alert('Gửi tin nhắn thất bại', error instanceof Error ? error.message : 'Không gửi được tin nhắn.');
    } finally {
      setSending(false);
    }
  };

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
            <View style={styles.metaRow}>
              <Text style={styles.roomMeta} numberOfLines={1}>
                {memberCount} thành viên{room.members.length ? ` • ${onlineCount} đang online` : ''}
              </Text>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Kho file"
                  style={[styles.iconAction, styles.fileAction]}
                  onPress={onOpenFiles}
                >
                  <Ionicons name="cloud-upload-outline" size={17} color={palette.surface} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Thông tin nhóm"
                  style={[styles.iconAction, styles.moreAction]}
                  onPress={onOpenInfo}
                >
                  <Ionicons name="ellipsis-vertical" size={17} color={palette.ink} />
                </Pressable>
              </View>
            </View>
          </View>
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
        onSend={handleSend}
        onPickImage={handlePickImage}
        selectedImage={selectedImage}
        onRemoveImage={() => setSelectedImage(null)}
        sending={sending}
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
    flex: 1,
    color: palette.textSoft,
    lineHeight: 20,
  },
  metaRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileAction: {
    backgroundColor: palette.brand,
  },
  moreAction: {
    backgroundColor: palette.accent,
  },
  messages: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
});
