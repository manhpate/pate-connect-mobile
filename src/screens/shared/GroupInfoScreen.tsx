import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenFrame } from '../../components/ScreenFrame';
import { useAppSession } from '../../context/AppSessionContext';
import { palette, radius, spacing } from '../../theme/tokens';
import { GroupRoom, RootStackParamList } from '../../types/app';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupInfo'>;

export function GroupInfoScreen({ navigation, route }: Props) {
  const { currentUser, loadRoomInfo, renameRoom, removeMemberFromRoom } = useAppSession();
  const [room, setRoom] = useState<GroupRoom | null>(null);
  const [draftName, setDraftName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      setLoading(true);
      setError('');
      try {
        const detail = await loadRoomInfo(route.params.roomId);
        if (!cancelled) {
          setRoom(detail);
          setDraftName(detail?.name || '');
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Không tải được thông tin nhóm');
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
  }, [loadRoomInfo, route.params.roomId]);

  if (!currentUser) {
    return null;
  }

  return (
    <ScreenFrame
      title="Thông tin nhóm"
      subtitle="Sửa tên nhóm, xem thành viên và quản lý người trong nhóm theo quyền."
      onBack={() => navigation.goBack()}
      scroll={false}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? <ActivityIndicator color={palette.brand} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!room ? null : (
          <>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tên nhóm</Text>
          <TextInput value={draftName} onChangeText={setDraftName} style={styles.input} placeholder="Nhập tên nhóm" />
          <Pressable
            style={styles.primaryButton}
            onPress={async () => {
              try {
                const updatedRoom = await renameRoom(room.id, draftName);
                if (updatedRoom) {
                  setRoom(updatedRoom);
                  setDraftName(updatedRoom.name);
                }
              } catch (nextError) {
                Alert.alert('Cập nhật nhóm thất bại', nextError instanceof Error ? nextError.message : 'Không đổi được tên nhóm.');
              }
            }}
          >
            <Text style={styles.primaryButtonText}>Lưu tên nhóm</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thành viên</Text>
          {room.members.map((member) => (
            <View key={member.id} style={styles.memberRow}>
              <View style={styles.memberCopy}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberMeta}>
                  {member.role} • {member.email}
                </Text>
              </View>
              {member.canRemove ? (
                <Pressable
                  style={styles.removeButton}
                  onPress={async () => {
                    try {
                      const updatedRoom = await removeMemberFromRoom(room.id, member.id);
                      if (updatedRoom) {
                        setRoom(updatedRoom);
                      }
                    } catch (nextError) {
                      Alert.alert(
                        'Xóa thành viên thất bại',
                        nextError instanceof Error ? nextError.message : 'Không xóa được thành viên.',
                      );
                    }
                  }}
                >
                  <Text style={styles.removeButtonText}>Xóa</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
          </>
        )}
      </ScrollView>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorText: {
    color: palette.danger,
    lineHeight: 20,
  },
  card: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: palette.canvas,
    paddingHorizontal: spacing.md,
    color: palette.ink,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: radius.pill,
    backgroundColor: palette.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
  },
  primaryButtonText: {
    color: palette.surface,
    fontWeight: '800',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#edf1f7',
  },
  memberCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.ink,
  },
  memberMeta: {
    color: palette.textSoft,
    lineHeight: 20,
  },
  removeButton: {
    minHeight: 40,
    borderRadius: radius.pill,
    backgroundColor: palette.dangerSoft,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: palette.danger,
    fontWeight: '800',
  },
});
