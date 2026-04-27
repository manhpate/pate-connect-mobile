import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, radius, spacing } from '../theme/tokens';

interface ScreenFrameProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  scroll?: boolean;
}

export function ScreenFrame({
  title,
  subtitle,
  children,
  headerAction,
  scroll = true,
}: ScreenFrameProps) {
  const content = scroll ? (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={styles.fill}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {headerAction}
      </View>
      {content}
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
    alignItems: 'flex-end',
    justifyContent: 'space-between',
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
});
