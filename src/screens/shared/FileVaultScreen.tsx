import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text } from 'react-native';

import { FileVaultPanel } from '../../components/FileVaultPanel';
import { ScreenFrame } from '../../components/ScreenFrame';
import { useAppSession } from '../../context/AppSessionContext';
import { GroupFile } from '../../types/app';
import { RootStackParamList } from '../../types/app';
import { palette, spacing } from '../../theme/tokens';
import { pickUploadFile } from '../../utils/filePicker';

type Props = NativeStackScreenProps<RootStackParamList, 'FileVault'>;

export function FileVaultScreen({ navigation, route }: Props) {
  const { rooms, loadRoomFiles, uploadRoomFile } = useAppSession();
  const [files, setFiles] = useState<GroupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const room = useMemo(() => rooms.find((item) => item.id === route.params.roomId), [rooms, route.params.roomId]);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      setLoading(true);
      setError('');
      try {
        const nextFiles = await loadRoomFiles(route.params.roomId);
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
  }, [loadRoomFiles, route.params.roomId]);

  return (
    <ScreenFrame scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator color={palette.brand} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!loading && !error && !room ? (
          <Text style={styles.emptyText}>Không tìm thấy thông tin nhóm để hiển thị kho file.</Text>
        ) : null}
        {room ? (
          <FileVaultPanel
            room={{ ...room, files }}
            uploading={uploading}
            onBack={() => navigation.goBack()}
            onUpload={async () => {
              try {
                const result = await pickUploadFile();
                if (result.error) {
                  Alert.alert('Không chọn được file', result.error);
                  return;
                }
                if (!result.file) return;

                setUploading(true);
                const uploadedFile = await uploadRoomFile(room.id, result.file);
                if (uploadedFile) {
                  setFiles((prev) => [uploadedFile, ...prev.filter((item) => item.id !== uploadedFile.id)]);
                }
              } catch (nextError) {
                Alert.alert('Upload file thất bại', nextError instanceof Error ? nextError.message : 'Không upload được file.');
              } finally {
                setUploading(false);
              }
            }}
          />
        ) : null}
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
