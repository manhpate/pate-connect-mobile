import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenFrame } from '../../components/ScreenFrame';
import { useAppSession } from '../../context/AppSessionContext';
import type { ActiveVoiceCall } from '../../services/voiceCallService';
import { getOneToOneVoiceChannelName, startOneToOneVoiceCall } from '../../services/voiceCallService';
import { palette, radius, spacing } from '../../theme/tokens';
import { GroupMember, GroupRoom, RootStackParamList } from '../../types/app';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupInfo'>;

interface VoiceCallPanelState {
  target: GroupMember;
  channelName: string;
  muted: boolean;
  remoteUserCount: number;
  status: 'preview' | 'connecting' | 'connected' | 'ending';
  note?: string;
}

const getVoiceCallErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  return 'Không bắt đầu được cuộc gọi thoại.';
};

export function GroupInfoScreen({ navigation, route }: Props) {
  const {
    createPrivateRoomFromMember,
    currentUser,
    inviteEmailsToRoom,
    loadRoomInfo,
    renameRoom,
    removeMemberFromRoom,
  } = useAppSession();
  const activeVoiceCallRef = useRef<ActiveVoiceCall | null>(null);
  const [room, setRoom] = useState<GroupRoom | null>(null);
  const [draftName, setDraftName] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [showRenameForm, setShowRenameForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmailsText, setInviteEmailsText] = useState('');
  const [invitingMembers, setInvitingMembers] = useState(false);
  const [startingPrivateMemberId, setStartingPrivateMemberId] = useState('');
  const [voiceCall, setVoiceCall] = useState<VoiceCallPanelState | null>(null);
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

  useEffect(() => () => {
    if (activeVoiceCallRef.current) {
      void activeVoiceCallRef.current.leave();
      activeVoiceCallRef.current = null;
    }
  }, []);

  if (!currentUser) {
    return null;
  }

  const handleInviteMembers = async () => {
    if (!room || invitingMembers) return;

    const emails = inviteEmailsText
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      Alert.alert('Mời email', 'Nhập ít nhất một email cần mời.');
      return;
    }

    setInvitingMembers(true);
    try {
      const updatedRoom = await inviteEmailsToRoom(room.id, emails);
      if (updatedRoom) {
        setRoom(updatedRoom);
        setDraftName(updatedRoom.name);
      }
      setInviteEmailsText('');
      setShowInviteForm(false);
      Alert.alert('Mời email', 'Đã mời email vào nhóm chat.');
    } catch (nextError) {
      Alert.alert('Mời email thất bại', nextError instanceof Error ? nextError.message : 'Không mời được email vào nhóm.');
    } finally {
      setInvitingMembers(false);
    }
  };

  const handleStartVoiceCall = async (member: GroupMember) => {
    if (!room || !member.userId) {
      Alert.alert('Gọi thoại', 'Thành viên này chưa có tài khoản app để nhận cuộc gọi.');
      return;
    }

    if (member.userId === currentUser.id) {
      Alert.alert('Gọi thoại', 'Không thể gọi cho chính tài khoản đang đăng nhập.');
      return;
    }

    const channelName = getOneToOneVoiceChannelName(room.id, currentUser.id, member.userId);
    setVoiceCall({
      target: member,
      channelName,
      muted: false,
      remoteUserCount: 0,
      status: Platform.OS === 'web' ? 'preview' : 'connecting',
      note: Platform.OS === 'web'
        ? 'Web preview chỉ tạo kênh để bạn generate temp token. Cuộc gọi thật chạy trên app điện thoại.'
        : undefined,
    });

    if (Platform.OS === 'web') {
      return;
    }

    try {
      const activeCall = await startOneToOneVoiceCall({
        roomId: room.id,
        currentUserId: currentUser.id,
        targetUserId: member.userId,
        onConnectionStateChange: (state) => {
          if (state === 'CONNECTED') {
            setVoiceCall((prev) => (prev ? { ...prev, status: 'connected' } : prev));
          }
        },
        onRemoteUserCountChange: (count) => {
          setVoiceCall((prev) => (prev ? { ...prev, remoteUserCount: count } : prev));
        },
      });
      activeVoiceCallRef.current = activeCall;
      setVoiceCall((prev) => (prev ? { ...prev, channelName: activeCall.channelName, status: 'connected' } : prev));
    } catch (nextError) {
      setVoiceCall(null);
      Alert.alert('Gọi thoại thất bại', getVoiceCallErrorMessage(nextError));
    }
  };

  const handleOpenPrivateRoom = async (member: GroupMember) => {
    if (!room || !member.userId || startingPrivateMemberId) {
      return;
    }

    if (member.userId === currentUser.id) {
      Alert.alert('Nhắn riêng', 'Không thể tạo nhóm nhắn riêng với chính tài khoản đang đăng nhập.');
      return;
    }

    setStartingPrivateMemberId(member.id);
    try {
      const privateRoom = await createPrivateRoomFromMember(room.id, member.userId);
      if (privateRoom?.id) {
        navigation.navigate('GroupChat', { roomId: privateRoom.id });
      }
    } catch (nextError) {
      Alert.alert('Nhắn riêng thất bại', nextError instanceof Error ? nextError.message : 'Không tạo được nhóm nhắn riêng.');
    } finally {
      setStartingPrivateMemberId('');
    }
  };

  const handleEndVoiceCall = async () => {
    const activeCall = activeVoiceCallRef.current;
    activeVoiceCallRef.current = null;
    setVoiceCall((prev) => (prev ? { ...prev, status: 'ending' } : prev));
    try {
      await activeCall?.leave();
    } catch (nextError) {
      console.warn('Không ngắt cuộc gọi được:', nextError);
    } finally {
      setVoiceCall(null);
    }
  };

  const handleToggleMute = async () => {
    const activeCall = activeVoiceCallRef.current;
    if (!activeCall || !voiceCall) return;

    const nextMuted = !voiceCall.muted;
    try {
      await activeCall.setMuted(nextMuted);
      setVoiceCall((prev) => (prev ? { ...prev, muted: nextMuted } : prev));
    } catch (nextError) {
      Alert.alert('Gọi thoại', getVoiceCallErrorMessage(nextError));
    }
  };

  return (
    <ScreenFrame scroll={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? <ActivityIndicator color={palette.brand} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!room ? null : (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Quay lại"
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={20} color={palette.ink} />
                </Pressable>
                <Text style={styles.sectionTitle} numberOfLines={2}>
                  {room.name}
                </Text>
                {room.canEditRoom ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Đổi tên nhóm"
                    style={[styles.iconButton, showRenameForm && styles.iconButtonActive]}
                    onPress={() => setShowRenameForm((prev) => !prev)}
                  >
                    <Ionicons name="pencil" size={18} color={palette.ink} />
                  </Pressable>
                ) : null}
              </View>
              {showRenameForm && room.canEditRoom ? (
                <View style={styles.renameForm}>
                  <TextInput
                    value={draftName}
                    onChangeText={setDraftName}
                    editable={!savingName}
                    style={styles.input}
                    placeholder="Nhập tên nhóm"
                  />
                  <Pressable
                    style={[styles.primaryButton, savingName && styles.buttonDisabled]}
                    disabled={savingName}
                    onPress={async () => {
                      const nextName = draftName.trim();
                      if (!nextName) {
                        Alert.alert('Tên nhóm', 'Nhập tên nhóm trước khi lưu.');
                        return;
                      }
                      setSavingName(true);
                      try {
                        const updatedRoom = await renameRoom(room.id, nextName);
                        if (updatedRoom) {
                          setRoom(updatedRoom);
                          setDraftName(updatedRoom.name);
                          setShowRenameForm(false);
                          Alert.alert('Tên nhóm', 'Đã cập nhật tên nhóm chat.');
                        }
                      } catch (nextError) {
                        Alert.alert(
                          'Cập nhật nhóm thất bại',
                          nextError instanceof Error ? nextError.message : 'Không đổi được tên nhóm.',
                        );
                      } finally {
                        setSavingName(false);
                      }
                    }}
                  >
                    <Text style={styles.primaryButtonText}>{savingName ? 'Đang lưu...' : 'Lưu tên nhóm'}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {voiceCall ? (
              <View style={styles.callCard}>
                <View style={styles.callIcon}>
                  <Ionicons name="call" size={20} color={palette.surface} />
                </View>
                <View style={styles.callCopy}>
                  <Text style={styles.callTitle} numberOfLines={1}>
                    {voiceCall.status === 'preview'
                      ? 'Kênh gọi để test token'
                      : voiceCall.status === 'connecting'
                        ? 'Đang gọi'
                        : 'Cuộc gọi thoại'}
                  </Text>
                  <Text style={styles.callMeta} numberOfLines={2}>
                    {voiceCall.target.name}
                    {' • '}
                    {voiceCall.status === 'preview'
                      ? 'Copy channel này sang Agora'
                      : voiceCall.remoteUserCount > 0
                        ? 'Đã có người tham gia'
                        : 'Đang chờ người kia tham gia'}
                  </Text>
                  <Text selectable style={styles.callChannel}>
                    {voiceCall.channelName}
                  </Text>
                  {voiceCall.note ? <Text style={styles.callNote}>{voiceCall.note}</Text> : null}
                </View>
                <View style={styles.callActions}>
                  {voiceCall.status !== 'preview' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={voiceCall.muted ? 'Bật micro' : 'Tắt micro'}
                      style={[styles.callControlButton, voiceCall.muted && styles.callControlButtonActive]}
                      onPress={handleToggleMute}
                    >
                      <Ionicons name={voiceCall.muted ? 'mic-off' : 'mic'} size={17} color={palette.ink} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Kết thúc cuộc gọi"
                    style={[styles.callControlButton, styles.endCallButton]}
                    disabled={voiceCall.status === 'ending'}
                    onPress={handleEndVoiceCall}
                  >
                    <Ionicons name="call" size={17} color={palette.surface} />
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View style={styles.card}>
              <View style={styles.membersHeader}>
                <Text style={styles.sectionTitle}>Thành viên</Text>
                {room.canManageMembers ? (
                  <Pressable
                    style={[styles.inviteToggleButton, showInviteForm && styles.inviteToggleActive]}
                    onPress={() => setShowInviteForm((prev) => !prev)}
                  >
                    <Ionicons name="person-add-outline" size={17} color={palette.ink} />
                    <Text style={styles.inviteToggleText}>Mời</Text>
                  </Pressable>
                ) : null}
              </View>
              {showInviteForm && room.canManageMembers ? (
                <View style={styles.inviteForm}>
                  <Text style={styles.inviteLabel}>Email cần mời</Text>
                  <TextInput
                    value={inviteEmailsText}
                    onChangeText={setInviteEmailsText}
                    placeholder="Nhập một hoặc nhiều email, cách nhau bởi dấu phẩy"
                    multiline
                    editable={!invitingMembers}
                    style={styles.inviteInput}
                  />
                  <View style={styles.inviteActions}>
                    <Pressable
                      style={[styles.secondaryButton, invitingMembers && styles.buttonDisabled]}
                      disabled={invitingMembers}
                      onPress={() => setShowInviteForm(false)}
                    >
                      <Text style={styles.secondaryButtonText}>Hủy</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.inviteSubmitButton, invitingMembers && styles.buttonDisabled]}
                      disabled={invitingMembers}
                      onPress={handleInviteMembers}
                    >
                      <Text style={styles.inviteSubmitText}>{invitingMembers ? 'Đang mời...' : 'Mời vào nhóm'}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
              {room.members.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <View style={styles.memberCopy}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberMeta}>
                      {member.role} • {member.email}
                    </Text>
                  </View>
                  <View style={styles.memberActions}>
                    {member.userId && member.userId !== currentUser.id ? (
                      <>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Nhắn riêng ${member.name}`}
                          style={[styles.messageMemberButton, startingPrivateMemberId === member.id && styles.buttonDisabled]}
                          disabled={startingPrivateMemberId === member.id}
                          onPress={() => handleOpenPrivateRoom(member)}
                        >
                          <Ionicons name="mail" size={18} color={palette.ink} />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Gọi ${member.name}`}
                          style={styles.callMemberButton}
                          onPress={() => handleStartVoiceCall(member)}
                        >
                          <Ionicons name="call" size={18} color={palette.surface} />
                        </Pressable>
                      </>
                    ) : null}
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
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.canvas,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    backgroundColor: palette.accent,
    borderColor: '#d39b00',
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
    flexShrink: 1,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: palette.canvas,
    paddingHorizontal: spacing.md,
    color: palette.ink,
  },
  renameForm: {
    gap: spacing.md,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  inviteToggleButton: {
    minHeight: 38,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  inviteToggleActive: {
    borderWidth: 1,
    borderColor: '#d39b00',
  },
  inviteToggleText: {
    color: palette.ink,
    fontWeight: '800',
  },
  inviteForm: {
    backgroundColor: palette.canvas,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  inviteLabel: {
    fontWeight: '800',
    color: palette.ink,
  },
  inviteInput: {
    minHeight: 74,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: palette.ink,
    textAlignVertical: 'top',
  },
  inviteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  secondaryButton: {
    minHeight: 40,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  secondaryButtonText: {
    color: palette.ink,
    fontWeight: '800',
  },
  inviteSubmitButton: {
    minHeight: 40,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.brand,
  },
  inviteSubmitText: {
    color: palette.surface,
    fontWeight: '800',
  },
  callCard: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  callIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: palette.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  callTitle: {
    color: palette.ink,
    fontWeight: '800',
  },
  callMeta: {
    color: palette.textSoft,
    lineHeight: 19,
  },
  callChannel: {
    color: palette.ink,
    fontWeight: '800',
    lineHeight: 19,
  },
  callNote: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  callActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  callControlButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callControlButtonActive: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
  },
  endCallButton: {
    backgroundColor: palette.danger,
    borderColor: palette.danger,
    transform: [{ rotate: '135deg' }],
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
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  callMemberButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageMemberButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
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
