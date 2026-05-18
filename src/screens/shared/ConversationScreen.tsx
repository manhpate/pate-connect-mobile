import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChatComposer } from '../../components/ChatComposer';
import { MessageBubble } from '../../components/MessageBubble';
import { useAppSession } from '../../context/AppSessionContext';
import { palette, radius, spacing } from '../../theme/tokens';
import { ConversationSummary, RootStackParamList, UploadImageFile } from '../../types/app';
import { pickChatImage } from '../../utils/chatImagePicker';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;

const aiHintByChannel = {
  website:
    'Ưu tiên xin số điện thoại và mời khách đăng nhập Google trên invaihn.vn. Sau đó chốt rằng nhân viên sẽ liên hệ sớm nhất.',
  zalo:
    'Trả lời ngắn, xác nhận đã tiếp nhận rồi kéo khách sang invaihn.vn để gửi file và làm việc thuận tiện hơn.',
  facebook:
    'Tối đa 1 lượt auto. Kéo khách về invaihn.vn, tránh hỏi dồn nhiều câu trong lần đầu.',
  instagram:
    'Trả lời ngắn như Facebook, ưu tiên kéo khách về invaihn.vn để gửi file và lưu thông tin làm việc.',
};

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
        <Ionicons name="arrow-back" size={20} color={palette.surface} />
      </Pressable>
      <View style={styles.headerCopy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
        `${conversation.channel.toUpperCase()} • ${
          conversation.aiStatus === 'ready' ? 'AI đang hỗ trợ' : 'Đang chờ nhân viên'
        }`,
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.aiHintCard}>
          <Text style={styles.aiHintTitle}>Gợi ý AI theo kênh</Text>
          <Text style={styles.aiHintText}>{aiHintByChannel[conversation.channel]}</Text>
        </View>

        {(conversation.messages || []).map((message) => (
          <MessageBubble key={message.id} message={message} currentUserName={currentUser.username} />
        ))}
      </ScrollView>

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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#243040',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: palette.surface,
    fontSize: 22,
    fontWeight: '800',
    flexShrink: 1,
  },
  subtitle: {
    color: '#c9d3e2',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  aiHintCard: {
    backgroundColor: palette.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#efd68f',
  },
  aiHintTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.ink,
  },
  aiHintText: {
    color: palette.ink,
    lineHeight: 22,
  },
});
