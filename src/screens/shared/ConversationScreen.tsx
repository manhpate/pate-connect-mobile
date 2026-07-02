import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ChatComposer } from '../../components/ChatComposer';
import { ChatMessageList } from '../../components/ChatMessageList';
import { useAppSession } from '../../context/AppSessionContext';
import { palette, spacing } from '../../theme/tokens';
import { ConversationSummary, RootStackParamList, UploadImageFile } from '../../types/app';
import { pickChatImage } from '../../utils/chatImagePicker';
import { getConversationChannelShortLabel } from '../../utils/mappers';
import { mergeMessagesChronologically } from '../../utils/messageMerge';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;

export function ConversationScreen({ navigation, route }: Props) {
  const {
    currentUser,
    loadConversationDetail,
    sendConversationMessage,
    sendConversationImage,
    markConversationRead,
  } = useAppSession();
  const [draft, setDraft] = useState('');
  const [selectedImage, setSelectedImage] = useState<UploadImageFile | null>(null);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<ConversationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      setLoading(true);
      setError('');
      try {
        const detail = await loadConversationDetail(route.params.conversationId);
        if (!cancelled) {
          setConversation(detail);
          if (detail?.unread) {
            await markConversationRead(detail.id);
          }
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
  }, [loadConversationDetail, markConversationRead, route.params.conversationId]);

  if (!currentUser) {
    return null;
  }

  const renderHeader = (title: string, subtitle?: string) => (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={19} color={palette.surface} />
      </Pressable>
      <View style={styles.headerCopy}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );

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
    } catch (nextError) {
      Alert.alert('Không chọn được ảnh', nextError instanceof Error ? nextError.message : 'Không mở được thư viện ảnh.');
    }
  };

  const handleLoadOlder = async () => {
    if (!conversation?.hasMoreBefore || !conversation.nextBeforeMessageId || loadingOlder) {
      return;
    }

    setLoadingOlder(true);
    try {
      const olderPage = await loadConversationDetail(conversation.id, {
        beforeMessageId: conversation.nextBeforeMessageId,
      });
      if (!olderPage) return;
      setConversation((prev) =>
        prev
          ? {
              ...prev,
              ...olderPage,
              messages: mergeMessagesChronologically(olderPage.messages || [], prev.messages || []),
            }
          : olderPage,
      );
    } catch (nextError) {
      console.warn('Không tải thêm lịch sử hội thoại:', nextError);
    } finally {
      setLoadingOlder(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.safe}>
        {renderHeader('Hội thoại', 'Đang tải lịch sử tin nhắn')}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.brand} />
        </View>
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={styles.safe}>
        {renderHeader('Hội thoại', 'Không mở được nội dung hội thoại')}
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Không tìm thấy hội thoại.'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      {renderHeader(
        conversation.title,
        `${getConversationChannelShortLabel(conversation.channel)} • ${
          conversation.aiStatus === 'ready' ? 'AI đang hỗ trợ' : 'Đang chờ nhân viên'
        }`,
      )}

      <ChatMessageList
        messages={conversation.messages || []}
        currentUserName={currentUser.username}
        hasMoreBefore={conversation.hasMoreBefore}
        loadingOlder={loadingOlder}
        onLoadOlder={handleLoadOlder}
      />

        <ChatComposer
          value={draft}
          onChangeText={setDraft}
          onSend={async () => {
            if (!draft.trim() && !selectedImage) {
              return;
            }
            setSending(true);
            try {
              const messages = selectedImage
                ? await sendConversationImage(conversation.id, draft, selectedImage)
                : await sendConversationMessage(conversation.id, draft).then((message) => (message ? [message] : []));
              if (messages.length === 0) return;
              const lastMessage = messages[messages.length - 1];
              setConversation((prev) =>
                prev
                  ? {
                      ...prev,
                      preview: lastMessage.body,
                      lastMessageAt: lastMessage.sentAt,
                      unread: 0,
                      messages: [...(prev.messages || []), ...messages],
                    }
                  : prev,
              );
              setDraft('');
              setSelectedImage(null);
            } catch (nextError) {
              Alert.alert(
                'Gửi phản hồi thất bại',
                nextError instanceof Error ? nextError.message : 'Không gửi được phản hồi.',
              );
            } finally {
              setSending(false);
            }
          }}
          onPickImage={
            conversation.canSendImages
              ? handlePickImage
              : () => Alert.alert('Chưa hỗ trợ gửi ảnh', conversation.imageDisabledReason || 'Hội thoại này chưa hỗ trợ gửi ảnh.')
          }
          selectedImage={selectedImage}
          onRemoveImage={() => setSelectedImage(null)}
          sending={sending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: palette.canvas,
  },
  errorText: {
    color: palette.danger,
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    backgroundColor: palette.dark,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#243040',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: palette.surface,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    flexShrink: 1,
  },
  subtitle: {
    color: '#c9d3e2',
    fontSize: 11,
    lineHeight: 14,
  },
});
