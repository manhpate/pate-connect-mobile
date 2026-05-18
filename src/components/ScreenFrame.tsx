import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, radius, shadows, spacing } from '../theme/tokens';

interface FloatingControlHelpers {
  scrollToTop: () => void;
}

interface ScreenFrameProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  onBack?: () => void;
  scroll?: boolean;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  showScrollTop?: boolean;
  scrollTopThreshold?: number;
  scrollTopRevealDistance?: number;
  floatingButtonPosition?: 'left' | 'right';
  floatingAccessory?: (helpers: FloatingControlHelpers) => React.ReactNode;
}

export function ScreenFrame({
  title,
  subtitle,
  children,
  headerAction,
  onBack,
  scroll = true,
  onEndReached,
  endReachedThreshold = 120,
  showScrollTop = false,
  scrollTopThreshold = 80,
  scrollTopRevealDistance = 24,
  floatingButtonPosition = 'left',
  floatingAccessory,
}: ScreenFrameProps) {
  const scrollViewRef = useRef<ScrollView | null>(null);
  const lastScrollYRef = useRef(0);
  const upwardDistanceRef = useRef(0);
  const [showFloatingControls, setShowFloatingControls] = useState(false);
  const hasHeader = Boolean(title || subtitle || headerAction || onBack);
  const scrollToTop = () => {
    setShowFloatingControls(false);
    upwardDistanceRef.current = 0;
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };
  const accessory = floatingAccessory?.({ scrollToTop });
  const content = scroll ? (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={120}
      onScroll={({ nativeEvent }) => {
        const currentY = Math.max(0, nativeEvent.contentOffset.y);
        if (showScrollTop) {
          const delta = currentY - lastScrollYRef.current;

          if (currentY <= scrollTopThreshold) {
            upwardDistanceRef.current = 0;
            setShowFloatingControls((prev) => (prev ? false : prev));
          } else if (delta < -1) {
            upwardDistanceRef.current += Math.abs(delta);
            if (upwardDistanceRef.current >= scrollTopRevealDistance) {
              setShowFloatingControls((prev) => (prev ? prev : true));
            }
          } else if (delta > 1) {
            upwardDistanceRef.current = 0;
            setShowFloatingControls((prev) => (prev ? false : prev));
          }
        }
        lastScrollYRef.current = currentY;

        if (onEndReached) {
          const distanceFromBottom =
            nativeEvent.contentSize.height -
            nativeEvent.layoutMeasurement.height -
            nativeEvent.contentOffset.y;
          if (distanceFromBottom <= endReachedThreshold) {
            onEndReached();
          }
        }
      }}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.fill}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {hasHeader ? (
        <View style={styles.header}>
          {onBack ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" style={styles.backButton} onPress={onBack}>
              <Ionicons name="arrow-back" size={20} color={palette.surface} />
            </Pressable>
          ) : null}
          <View style={styles.headerCopy}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {headerAction}
        </View>
      ) : null}
      {content}
      {scroll && showScrollTop && showFloatingControls ? (
        <View pointerEvents="box-none" style={styles.floatingLayer}>
          <View style={accessory ? styles.floatingBar : styles.floatingSolo}>
            {floatingButtonPosition === 'left' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Lên đầu danh sách"
                style={styles.scrollTopButton}
                onPress={scrollToTop}
              >
                <Ionicons name="arrow-up" size={17} color={palette.brandDark} />
              </Pressable>
            ) : null}
            {accessory ? <View style={styles.floatingAccessory}>{accessory}</View> : null}
            {floatingButtonPosition === 'right' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Lên đầu danh sách"
                style={styles.scrollTopButton}
                onPress={scrollToTop}
              >
                <Ionicons name="arrow-up" size={17} color={palette.brandDark} />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  header: {
    backgroundColor: palette.dark,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#243040',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerCopy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  title: {
    color: palette.surface,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#d1d7e2',
    marginTop: spacing.xs,
    fontSize: 14,
    lineHeight: 20,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  fill: {
    flex: 1,
  },
  floatingLayer: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    zIndex: 20,
    alignItems: 'flex-end',
  },
  floatingBar: {
    width: '100%',
    minHeight: 46,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    ...shadows.card,
  },
  floatingSolo: {
    alignSelf: 'flex-end',
  },
  scrollTopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.brandSoft,
    borderWidth: 1,
    borderColor: '#bceadf',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingAccessory: {
    flex: 1,
    minWidth: 0,
  },
});
