import * as DocumentPicker from 'expo-document-picker';

import { UploadFile } from '../types/app';

export const pickUploadFile = async (): Promise<{ file?: UploadFile; error?: string }> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    multiple: false,
    copyToCacheDirectory: true,
    base64: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return {};
  }

  const asset = result.assets[0];
  return {
    file: {
      uri: asset.uri,
      name: String(asset.name || `tep-chat-${Date.now()}`),
      mimeType: String(asset.mimeType || 'application/octet-stream'),
      sizeBytes: Number(asset.size || asset.file?.size || 0),
      file: asset.file,
    },
  };
};
