import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { GroupRoom, UploadImageFile } from '../types/app';
import { palette, radius, spacing } from '../theme/tokens';
import { pickChatImage } from '../utils/chatImagePicker';
import { ChatComposer } from './ChatComposer';
import { ChatMessageList } from './ChatMessageList';

interface GroupChatPanelProps {
  room: GroupRoom;
  currentUserName: string;
  onSend: (body: string, image?: UploadImageFile) => Promise<void> | void;
  onBack?: () => void;
  onOpenInfo: () => void;
  onOpenFiles: () => void;
  loadingOlder?: boolean;
  onLoadOlder?: () => Promise<void> | void;
}

export function GroupChatPanel({
  room,
  currentUserName,
  onSend,
  onBack,
  onOpenInfo,
  onOpenFiles,
  loadingOlder = false,
  onLoadOlder,
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
            <Text style={styles.roomName} numberOfLines={1}>
              {room.name}
            </Text>
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
                  <Ionicons name="cloud-upload-outline" size={16} color={palette.surface} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Thông tin nhóm"
                  style={[styles.iconAction, styles.moreAction]}
                  onPress={onOpenInfo}
                >
                  <Ionicons name="ellipsis-vertical" size={16} color={palette.ink} />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>

      <ChatMessageList
        messages={room.messages}
        currentUserName={currentUserName}
        hasMoreBefore={room.hasMoreBefore}
        loadingOlder={loadingOlder}
        onLoadOlder={onLoadOlder}
      />

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
    marginHorizontal: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.canvas,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  roomName: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: palette.ink,
  },
  roomMeta: {
    flex: 1,
    fontSize: 13,
    color: palette.textSoft,
    lineHeight: 17,
  },
  metaRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconAction: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileAction: {
    backgroundColor: palette.brand,
  },
  moreAction: {
    backgroundColor: palette.accent,
  },
});
