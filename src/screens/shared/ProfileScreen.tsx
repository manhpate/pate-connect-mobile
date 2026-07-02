import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenFrame } from '../../components/ScreenFrame';
import { useAppSession } from '../../context/AppSessionContext';
import { palette, radius, shadows, spacing } from '../../theme/tokens';
import { pickChatImage } from '../../utils/chatImagePicker';

const getInitials = (name: string) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const chars = Array.from(parts[0]);
    return `${chars[0] || ''}${chars.length > 1 ? chars[chars.length - 1] : ''}`.toLocaleUpperCase('vi-VN');
  }

  const first = Array.from(parts[0])[0] || '';
  const last = Array.from(parts[parts.length - 1])[0] || '';
  return `${first}${last}`.toLocaleUpperCase('vi-VN');
};

export function ProfileScreen() {
  const { currentUser, signOut, uploadAccountAvatar } = useAppSession();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const displayAvatarUri = currentUser?.photoUrl || '';
  const initials = useMemo(() => getInitials(currentUser?.username || ''), [currentUser?.username]);
  const permissionCount = currentUser?.permissions.length || 0;

  if (!currentUser) {
    return null;
  }

  const handlePickAvatar = async () => {
    try {
      const result = await pickChatImage();
      if (result.error) {
        Alert.alert('Không chọn được ảnh', result.error);
        return;
      }
      if (result.image?.uri) {
        setUploadingAvatar(true);
        await uploadAccountAvatar(result.image);
      }
    } catch (error) {
      Alert.alert('Không cập nhật được ảnh', error instanceof Error ? error.message : 'Không tải ảnh đại diện lên được.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleOpenAvatar = () => {
    if (!displayAvatarUri) {
      Alert.alert('Chưa có ảnh đại diện', 'Tài khoản này chưa có ảnh đại diện.');
      return;
    }
    void Linking.openURL(displayAvatarUri);
  };

  return (
    <ScreenFrame>
      <View style={styles.actionRow}>
        <Text onPress={signOut} style={styles.logout}>
          Đăng xuất
        </Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel="Xem ảnh đại diện"
            style={styles.avatarButton}
            onPress={() => setShowAvatarModal(true)}
          >
            {displayAvatarUri ? (
              <Image source={{ uri: displayAvatarUri }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </Pressable>
          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={1}>{currentUser.username}</Text>
            <Text style={styles.meta} numberOfLines={2}>
              {currentUser.roleLabel} • {currentUser.email}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          style={styles.permissionToggle}
          onPress={() => setShowPermissions((prev) => !prev)}
        >
          <View style={styles.permissionToggleCopy}>
            <Ionicons name="id-card-outline" size={18} color={palette.brandDark} />
            <Text style={styles.permissionToggleText}>Thẻ quyền</Text>
            <Text style={styles.permissionCount}>{permissionCount}</Text>
          </View>
          <Ionicons name={showPermissions ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textSoft} />
        </Pressable>

        {showPermissions ? (
          <View style={styles.permissionsPanel}>
            <Text style={styles.permissionDescription}>
              Quyền là các thẻ chức năng tài khoản được phép truy cập trong hệ thống. Nếu thiếu quyền, mục tương ứng có thể bị ẩn hoặc không thao tác được.
            </Text>
            <View style={styles.pills}>
              {currentUser.permissions.map((permission) => (
                <View key={permission} style={styles.permissionPill}>
                  <Text style={styles.permissionText}>{permission}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <Modal visible={showAvatarModal} transparent animationType="fade" onRequestClose={() => setShowAvatarModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.avatarModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ảnh đại diện</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng" style={styles.modalClose} onPress={() => setShowAvatarModal(false)}>
                <Ionicons name="close" size={20} color={palette.ink} />
              </Pressable>
            </View>

            <View style={styles.largeAvatar}>
              {displayAvatarUri ? (
                <Image source={{ uri: displayAvatarUri }} style={styles.largeAvatarImage} resizeMode="cover" />
              ) : (
                <Text style={styles.largeAvatarInitials}>{initials}</Text>
              )}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={uploadingAvatar}
                style={[styles.primaryAction, uploadingAvatar && styles.actionDisabled]}
                onPress={handlePickAvatar}
              >
                <Ionicons name={uploadingAvatar ? 'cloud-upload-outline' : 'image-outline'} size={18} color={palette.surface} />
                <Text style={styles.primaryActionText}>{uploadingAvatar ? 'Đang tải lên...' : 'Chọn ảnh trên máy'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={styles.secondaryAction} onPress={handleOpenAvatar}>
                <Ionicons name="eye-outline" size={18} color={palette.brandDark} />
                <Text style={styles.secondaryActionText}>Xem ảnh đại diện</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    alignItems: 'flex-end',
  },
  logout: {
    color: palette.brandDark,
    fontWeight: '800',
  },
  profileCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: palette.brandSoft,
    borderWidth: 2,
    borderColor: '#bceadf',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    color: palette.brandDark,
    fontSize: 22,
    fontWeight: '900',
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    color: palette.ink,
  },
  meta: {
    color: palette.textSoft,
    lineHeight: 22,
  },
  permissionToggle: {
    marginTop: spacing.md,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceAlt,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  permissionToggleCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  permissionToggleText: {
    color: palette.ink,
    fontWeight: '900',
  },
  permissionCount: {
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: palette.brandSoft,
    color: palette.brandDark,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  permissionsPanel: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  permissionDescription: {
    color: palette.textSoft,
    lineHeight: 20,
    fontSize: 13,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  permissionPill: {
    backgroundColor: palette.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  permissionText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(21, 26, 34, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  avatarModal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeAvatar: {
    alignSelf: 'center',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: palette.brandSoft,
    borderWidth: 3,
    borderColor: '#bceadf',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  largeAvatarImage: {
    width: '100%',
    height: '100%',
  },
  largeAvatarInitials: {
    color: palette.brandDark,
    fontSize: 48,
    fontWeight: '900',
  },
  modalActions: {
    gap: spacing.sm,
  },
  primaryAction: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: palette.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  actionDisabled: {
    opacity: 0.65,
  },
  primaryActionText: {
    color: palette.surface,
    fontWeight: '900',
  },
  secondaryAction: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#bceadf',
    backgroundColor: palette.brandSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  secondaryActionText: {
    color: palette.brandDark,
    fontWeight: '900',
  },
});
