import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChatComposer } from '../../components/ChatComposer';
import { MessageBubble } from '../../components/MessageBubble';
import { useAppSession } from '../../context/AppSessionContext';
import { palette, radius, spacing } from '../../theme/tokens';
import { ConversationSummary, RootStackParamList } from '../../types/app';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;

const aiHintByChannel = {
  website:
    'Ưu tiên xin số điện thoại và mời khách đăng nhập Google trên invaihn.vn. Sau đó chốt rằng nhân viên sẽ liên hệ sớm nhất.',
  zalo:
    'Trả lời ngắn, xác nhận đã tiếp nhận rồi kéo khách sang invaihn.vn để gửi file và làm việc thuận tiện hơn.',
  facebook:
    'Tối đa 1 lượt auto. Kéo khách về invaihn.vn, tránh hỏi dồn nhiều câu trong lần đầu.',
};

export function ConversationScreen({ route }: Props) {
  const { currentUser, loadConversationDetail, sendConversationMessage, markConversationRead } = useAppSession();
  const [draft, setDraft] = useState('');
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={palette.brand} />
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Không tìm thấy hội thoại.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{conversation.title}</Text>
        <Text style={styles.subtitle}>
          {conversation.channel.toUpperCase()} • {conversation.aiStatus === 'ready' ? 'AI đang hỗ trợ' : 'Đang chờ nhân viên'}
        </Text>
      </View>

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
            if (!draft.trim()) {
              return;
            }
            try {
              const message = await sendConversationMessage(conversation.id, draft);
              if (!message) return;
              setConversation((prev) =>
                prev
                  ? {
                      ...prev,
                      preview: message.body,
                      lastMessageAt: message.sentAt,
                      unread: 0,
                      messages: [...(prev.messages || []), message],
                    }
                  : prev,
              );
              setDraft('');
            } catch (nextError) {
              Alert.alert(
                'Gửi phản hồi thất bại',
                nextError instanceof Error ? nextError.message : 'Không gửi được phản hồi.',
              );
            }
          }}
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
    gap: spacing.xs,
  },
  title: {
    color: palette.surface,
    fontSize: 22,
    fontWeight: '800',
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
