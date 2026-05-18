import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { UploadImageFile } from '../types/app';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

const inferMimeType = (nameOrUri = '') => {
  const value = String(nameOrUri || '').toLowerCase();
  if (value.endsWith('.png')) return 'image/png';
  if (value.endsWith('.webp')) return 'image/webp';
  if (value.endsWith('.jpg') || value.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
};

const inferFileName = (asset: ImagePicker.ImagePickerAsset, mimeType: string) => {
  const fileName = String(asset.fileName || asset.file?.name || '').trim();
  if (fileName) return fileName;

  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  return `anh-chat-${Date.now()}.${ext}`;
};

export const pickChatImage = async (): Promise<{ image?: UploadImageFile; error?: string }> => {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { error: 'Bạn cần cấp quyền truy cập ảnh để tải ảnh lên.' };
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 0.95,
  });

  if (result.canceled || !result.assets?.[0]) {
    return {};
  }

  const asset = result.assets[0];
  const mimeType = String(asset.mimeType || asset.file?.type || inferMimeType(asset.fileName || asset.uri)).toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    return { error: 'Chỉ hỗ trợ ảnh PNG, JPG hoặc WEBP.' };
  }

  const sizeBytes = Number(asset.fileSize || asset.file?.size || 0);
  if (sizeBytes > MAX_IMAGE_BYTES) {
    return { error: 'Ảnh vượt quá giới hạn 3MB.' };
  }

  return {
    image: {
      uri: asset.uri,
      name: inferFileName(asset, mimeType),
      mimeType,
      sizeBytes,
      file: asset.file,
    },
  };
};
