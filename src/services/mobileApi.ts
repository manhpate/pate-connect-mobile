import { apiClient } from './apiClient';
import { UploadFile, UploadImageFile } from '../types/app';

export interface ApiEnvelope<T = unknown> {
  EC: number;
  EM: string;
  DT: T;
  [key: string]: unknown;
}

interface MessagePageParams {
  limit?: number;
  beforeMessageId?: string | null;
}

interface MessagePagePagination {
  limit?: number;
  hasMoreBefore?: boolean;
  nextBeforeMessageId?: string | number | null;
}

const appendImageToFormData = (formData: FormData, image: UploadImageFile, fieldName = 'image') => {
  if (image.file) {
    formData.append(fieldName, image.file as Blob, image.name);
    return;
  }

  formData.append(fieldName, {
    uri: image.uri,
    name: image.name,
    type: image.mimeType,
  } as unknown as Blob);
};

const appendFileToFormData = (formData: FormData, file: UploadFile) => {
  if (file.file) {
    formData.append('file', file.file as Blob, file.name);
    return;
  }

  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);
};

export const loginWithPasswordApi = (tenDangNhap: string, password: string) =>
  apiClient.post('/api/v1/login', {
    data: {
      tenDangNhap,
      password,
      kieu_dn: 'bt',
    },
  }) as Promise<ApiEnvelope<{ access_token?: string; firebase_token?: string; account?: unknown }>>;

export const loginWithGoogleApi = (payload: {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}) =>
  apiClient.post('/api/v1/login', {
    data: {
      ...payload,
      kieu_dn: 'gg',
    },
  }) as Promise<ApiEnvelope<{ access_token?: string; firebase_token?: string; account?: unknown }>>;

export const checkAccountApi = () =>
  apiClient.get('/api/v1/check_account') as Promise<ApiEnvelope<{ access_token?: string } & Record<string, unknown>>>;

export const logoutApi = () =>
  apiClient.post('/api/v1/logout') as Promise<ApiEnvelope<null>>;

export const uploadAccountAvatarApi = (image: UploadImageFile) => {
  const formData = new FormData();
  appendImageToFormData(formData, image, 'avatar');

  return apiClient.post('/api/v1/account/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }) as Promise<ApiEnvelope<{ photo_url?: string; object_key?: string; content_type?: string; size?: number }>>;
};

export const readChatGroupRoomsApi = () =>
  apiClient.get('/api/chat-groups/rooms', {
    params: {
      limit: 50,
      offset: 0,
    },
  }) as Promise<ApiEnvelope<{ rooms?: unknown[]; totalUnread?: number }>>;

export const ensureWebsiteChatGroupRoomApi = () =>
  apiClient.post('/api/chat-groups/rooms/website-entry') as Promise<ApiEnvelope<{ room?: unknown }>>;

export const readChatGroupRoomMessagesApi = (roomId: string, {
  limit = 30,
  beforeMessageId = null,
}: MessagePageParams = {}) =>
  apiClient.get(`/api/chat-groups/rooms/${roomId}/messages`, {
    params: {
      limit,
      beforeMessageId: beforeMessageId || undefined,
    },
  }) as Promise<ApiEnvelope<{ room?: unknown; messages?: unknown[]; pagination?: MessagePagePagination }>>;

export const readChatGroupRoomInfoApi = (roomId: string) =>
  apiClient.get(`/api/chat-groups/rooms/${roomId}/info`) as Promise<ApiEnvelope<{ room?: unknown }>>;

export const readChatGroupRoomFilesApi = (roomId: string) =>
  apiClient.get(`/api/chat-groups/rooms/${roomId}/files`) as Promise<ApiEnvelope<{ assets?: unknown[] }>>;

export const uploadChatGroupRoomFileApi = (roomId: string, file: UploadFile) => {
  const formData = new FormData();
  appendFileToFormData(formData, file);

  return apiClient.post(`/api/chat-groups/rooms/${roomId}/files/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }) as Promise<ApiEnvelope<{ asset?: unknown }>>;
};

export const sendChatGroupMessageApi = (roomId: string, text: string) =>
  apiClient.post(`/api/chat-groups/rooms/${roomId}/messages`, { text }) as Promise<
    ApiEnvelope<{ room?: unknown; message?: unknown }>
  >;

export const sendChatGroupImageApi = (roomId: string, text: string, image: UploadImageFile) => {
  const formData = new FormData();
  if (text.trim()) {
    formData.append('text', text.trim());
  }
  appendImageToFormData(formData, image);

  return apiClient.post(`/api/chat-groups/rooms/${roomId}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }) as Promise<ApiEnvelope<{ room?: unknown; message?: unknown }>>;
};

export const markChatGroupRoomReadApi = (roomId: string) =>
  apiClient.post(`/api/chat-groups/rooms/${roomId}/mark-read`) as Promise<ApiEnvelope<unknown>>;

export const inviteEmailsToChatGroupRoomApi = (roomId: string, payload: { emails: string[] }) =>
  apiClient.post(`/api/chat-groups/rooms/${roomId}/members`, payload) as Promise<
    ApiEnvelope<{ room?: unknown; messages?: unknown[] }>
  >;

export const createPrivateChatGroupRoomApi = (roomId: string, payload: { targetUserId: number }) =>
  apiClient.post(`/api/chat-groups/rooms/${roomId}/private-message`, payload) as Promise<
    ApiEnvelope<{ room?: unknown; messages?: unknown[] }>
  >;

export const updateChatGroupRoomInfoApi = (roomId: string, payload: { name: string }) =>
  apiClient.patch(`/api/chat-groups/rooms/${roomId}`, payload) as Promise<ApiEnvelope<{ room?: unknown }>>;

export const removeMemberFromChatGroupRoomApi = (roomId: string, memberId: string) =>
  apiClient.delete(`/api/chat-groups/rooms/${roomId}/members/${memberId}`) as Promise<ApiEnvelope<{ room?: unknown }>>;

export const createChatGroupRoomRtcTokenApi = (
  roomId: string,
  payload: { targetUserId: number; channelName: string },
) =>
  apiClient.post(`/api/chat-groups/rooms/${roomId}/rtc-token`, payload) as Promise<
    ApiEnvelope<{
      appId?: string;
      token?: string;
      channelName?: string;
      uid?: number;
      targetUserId?: number;
      expiresIn?: number;
      expiresAt?: number;
    }>
  >;

export const readChatConversationsApi = ({ limit = 50, offset = 0 } = {}) =>
  apiClient.get('/api/chat/conversations', {
    params: {
      limit,
      offset,
    },
  }) as Promise<ApiEnvelope<{ conversations?: unknown[]; totalUnread?: number; pagination?: {
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    nextOffset?: number | null;
  } }>>;

export const readChatConversationMessagesApi = (conversationId: string, {
  limit = 30,
  beforeMessageId = null,
}: MessagePageParams = {}) =>
  apiClient.get(`/api/chat/conversations/${conversationId}/messages`, {
    params: {
      limit,
      beforeMessageId: beforeMessageId || undefined,
    },
  }) as Promise<ApiEnvelope<{ conversation?: unknown; messages?: unknown[]; pagination?: MessagePagePagination }>>;

export const sendChatConversationMessageApi = (conversationId: string, text: string) =>
  apiClient.post(`/api/chat/conversations/${conversationId}/messages`, { text }) as Promise<
    ApiEnvelope<{ conversation?: unknown; message?: unknown }>
  >;

export const sendChatConversationImageApi = (conversationId: string, text: string, image: UploadImageFile) => {
  const formData = new FormData();
  if (text.trim()) {
    formData.append('text', text.trim());
  }
  appendImageToFormData(formData, image);

  return apiClient.post(`/api/chat/conversations/${conversationId}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }) as Promise<ApiEnvelope<{ conversation?: unknown; message?: unknown; messages?: unknown[] }>>;
};

export const markChatConversationReadApi = (conversationId: string) =>
  apiClient.post(`/api/chat/conversations/${conversationId}/mark-read`) as Promise<ApiEnvelope<unknown>>;

export const readNotificationsApi = () =>
  apiClient.post('/api/v1/thongbao/readThongBao_UserById', {}) as Promise<
    ApiEnvelope<{ notifications?: unknown[]; unreadCount?: number }>
  >;

export const readNotificationsPageApi = (userId: number, page = 1, limit = 10) =>
  apiClient.get('/api/v1/thongbao/getThongBaoByPage', {
    params: {
      userid: userId,
      page,
      limit,
    },
  }) as Promise<ApiEnvelope<unknown[]> & { hasMore?: boolean }>;

export const markNotificationReadApi = (userId: number, thongbaoId: string) =>
  apiClient.post('/api/v1/thongbao/markThongBaoAsRead', {
    userid: userId,
    thongbaoId,
  }) as Promise<{ success?: boolean; newStatus?: boolean }>;

export const markAllNotificationsReadApi = (userId: number) =>
  apiClient.post('/api/v1/thongbao/markAllThongBaoAsRead', {
    userid: userId,
  }) as Promise<{ success?: boolean }>;
