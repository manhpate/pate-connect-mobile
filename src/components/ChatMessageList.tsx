import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';

import { palette, spacing } from '../theme/tokens';
import { AppMessage } from '../types/app';
import { MessageBubble } from './MessageBubble';

interface ChatMessageListProps {
  messages: AppMessage[];
  currentUserName: string;
  hasMoreBefore: boolean;
  loadingOlder: boolean;
  onLoadOlder?: () => Promise<void> | void;
}

const LOAD_OLDER_THRESHOLD = 72;
const BOTTOM_STICK_THRESHOLD = 96;

const afterFrame = (callback: () => void) => {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(callback);
    return;
  }
  setTimeout(callback, 0);
};

export function ChatMessageList({
  messages,
  currentUserName,
  hasMoreBefore,
  loadingOlder,
  onLoadOlder,
}: ChatMessageListProps) {
  const scrollViewRef = useRef<ScrollView | null>(null);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);
  const scrollYRef = useRef(0);
  const pendingPrependRef = useRef<{ height: number; y: number } | null>(null);
  const loadingOlderRef = useRef(false);
  const lastMessageIdRef = useRef('');

  useEffect(() => {
    loadingOlderRef.current = loadingOlder;
  }, [loadingOlder]);

  const scrollToEnd = useCallback((animated = false) => {
    afterFrame(() => scrollViewRef.current?.scrollToEnd({ animated }));
  }, []);

  const handleContentSizeChange = useCallback((_: number, height: number) => {
    const pendingPrepend = pendingPrependRef.current;
    const previousHeight = pendingPrepend?.height || contentHeightRef.current;
    contentHeightRef.current = height;

    if (pendingPrepend && height > previousHeight) {
      pendingPrependRef.current = null;
      afterFrame(() => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, pendingPrepend.y + height - previousHeight),
          animated: false,
        });
      });
      return;
    }

    if (!lastMessageIdRef.current && messages.length > 0) {
      scrollToEnd(false);
    }
  }, [messages.length, scrollToEnd]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const y = Math.max(0, contentOffset.y);
    const contentHeight = contentSize.height || contentHeightRef.current;
    const layoutHeight = layoutMeasurement.height || layoutHeightRef.current;
    scrollYRef.current = y;
    contentHeightRef.current = contentHeight;
    layoutHeightRef.current = layoutHeight;

    const nearTop = y <= LOAD_OLDER_THRESHOLD;
    if (nearTop && hasMoreBefore && !loadingOlderRef.current && onLoadOlder) {
      pendingPrependRef.current = {
        height: contentHeight,
        y,
      };
      loadingOlderRef.current = true;
      void onLoadOlder();
    }
  }, [hasMoreBefore, onLoadOlder]);

  useEffect(() => {
    const lastMessageId = messages[messages.length - 1]?.id || '';
    if (!lastMessageId || lastMessageId === lastMessageIdRef.current) {
      return;
    }

    const wasAtBottom =
      !lastMessageIdRef.current ||
      scrollYRef.current + layoutHeightRef.current >= contentHeightRef.current - BOTTOM_STICK_THRESHOLD;
    lastMessageIdRef.current = lastMessageId;

    if (wasAtBottom && !pendingPrependRef.current) {
      scrollToEnd(false);
    }
  }, [messages, scrollToEnd]);

  return (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={styles.messages}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={handleContentSizeChange}
      onLayout={(event) => {
        layoutHeightRef.current = event.nativeEvent.layout.height;
      }}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator
    >
      {loadingOlder ? (
        <View style={styles.loadingOlder}>
          <ActivityIndicator size="small" color={palette.brand} />
        </View>
      ) : null}
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          previousMessage={messages[index - 1]}
          currentUserName={currentUserName}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  messages: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  loadingOlder: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
