import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FileVaultPanel } from '../../components/FileVaultPanel';
import { ScreenFrame } from '../../components/ScreenFrame';
import { useAppSession } from '../../context/AppSessionContext';
import { GroupFile } from '../../types/app';
import { palette, spacing } from '../../theme/tokens';

export function CustomerFilesScreen() {
  const { currentUser, rooms, ensureCustomerPrimaryRoom, loadRoomFiles } = useAppSession();
  const [files, setFiles] = useState<GroupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const room = useMemo(
    () => rooms.find((item) => item.id === String(currentUser?.primaryRoomId || '')) ?? rooms[0],
    [currentUser?.primaryRoomId, rooms],
  );

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;
    const hydrate = async () => {
      setLoading(true);
      setError('');
      try {
        const ensuredRoom = room || (await ensureCustomerPrimaryRoom());
        if (!ensuredRoom) {
          throw new Error('Tài khoản này chưa có nhóm chat khả dụng.');
        }
        const nextFiles = await loadRoomFiles(ensuredRoom.id);
        if (!cancelled) {
          setFiles(nextFiles);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Không tải được kho file');
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
  }, [currentUser, ensureCustomerPrimaryRoom, loadRoomFiles, room]);

  return (
    <ScreenFrame
      title="Kho file nhóm"
      subtitle={room?.name || 'Khách hàng chỉ nhìn thấy file của nhóm chăm sóc riêng mình.'}
      scroll={false}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator color={palette.brand} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!loading && !error && !room ? (
          <Text style={styles.emptyText}>Tài khoản này chưa có nhóm chat khả dụng để hiển thị kho file.</Text>
        ) : null}
        {room ? <FileVaultPanel room={{ ...room, files }} /> : null}
      </ScrollView>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.lg,
  },
  errorText: {
    color: palette.danger,
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  emptyText: {
    color: palette.textSoft,
    paddingHorizontal: spacing.lg,
    lineHeight: 22,
  },
});
