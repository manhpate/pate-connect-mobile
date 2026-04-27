import { apiClient } from './apiClient';

export interface ApiEnvelope<T = unknown> {
  EC: number;
  EM: string;
  DT: T;
  [key: string]: unknown;
}

export const loginWithPasswordApi = (tenDangNhap: string, password: string) =>
  apiClient.post('/api/v1/login', {
    data: {
      tenDangNhap,
      password,
      kieu_dn: 'bt',
    },
  }) as Promise<ApiEnvelope<{ access_token?: string; account?: unknown }>>;

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
  }) as Promise<ApiEnvelope<{ access_token?: string; account?: unknown }>>;

export const checkAccountApi = () =>
  apiClient.get('/api/v1/check_account') as Promise<ApiEnvelope<{ access_token?: string } & Record<string, unknown>>>;

export const logoutApi = () =>
  apiClient.post('/api/v1/logout') as Promise<ApiEnvelope<null>>;

export const readChatGroupRoomsApi = () =>
  apiClient.get('/api/chat-groups/rooms', {
    params: {
      limit: 50,
      offset: 0,
    },
  }) as Promise<ApiEnvelope<{ rooms?: unknown[]; totalUnread?: number }>>;

export const ensureWebsiteChatGroupRoomApi = () =>
  apiClient.post('/api/chat-groups/rooms/website-entry') as Promise<ApiEnvelope<{ room?: unknown }>>;

export const readChatGroupRoomMessagesApi = (roomId: string) =>
  apiClient.get(`/api/chat-groups/rooms/${roomId}/messages`, {
    params: {
      limit: 80,
    },
  }) as Promise<ApiEnvelope<{ room?: unknown; messages?: unknown[] }>>;

export const readChatGroupRoomInfoApi = (roomId: string) =>
  apiClient.get(`/api/chat-groups/rooms/${roomId}/info`) as Promise<ApiEnvelope<{ room?: unknown }>>;

export const readChatGroupRoomFilesApi = (roomId: string) =>
  apiClient.get(`/api/chat-groups/rooms/${roomId}/files`) as Promise<ApiEnvelope<{ assets?: unknown[] }>>;

export const sendChatGroupMessageApi = (roomId: string, text: string) =>
  apiClient.post(`/api/chat-groups/rooms/${roomId}/messages`, { text }) as Promise<
    ApiEnvelope<{ room?: unknown; message?: unknown }>
  >;

export const markChatGroupRoomReadApi = (roomId: string) =>
  apiClient.post(`/api/chat-groups/rooms/${roomId}/mark-read`) as Promise<ApiEnvelope<unknown>>;

export const updateChatGroupRoomInfoApi = (roomId: string, payload: { name: string }) =>
  apiClient.patch(`/api/chat-groups/rooms/${roomId}`, payload) as Promise<ApiEnvelope<{ room?: unknown }>>;

export const removeMemberFromChatGroupRoomApi = (roomId: string, memberId: string) =>
  apiClient.delete(`/api/chat-groups/rooms/${roomId}/members/${memberId}`) as Promise<ApiEnvelope<{ room?: unknown }>>;

export const readChatConversationsApi = () =>
  apiClient.get('/api/chat/conversations', {
    params: {
      limit: 50,
      offset: 0,
    },
  }) as Promise<ApiEnvelope<{ conversations?: unknown[]; totalUnread?: number }>>;

export const readChatConversationMessagesApi = (conversationId: string) =>
  apiClient.get(`/api/chat/conversations/${conversationId}/messages`, {
    params: {
      limit: 80,
    },
  }) as Promise<ApiEnvelope<{ conversation?: unknown; messages?: unknown[] }>>;

export const sendChatConversationMessageApi = (conversationId: string, text: string) =>
  apiClient.post(`/api/chat/conversations/${conversationId}/messages`, { text }) as Promise<
    ApiEnvelope<{ conversation?: unknown; message?: unknown }>
  >;

export const markChatConversationReadApi = (conversationId: string) =>
  apiClient.post(`/api/chat/conversations/${conversationId}/mark-read`) as Promise<ApiEnvelope<unknown>>;

export const readNotificationsApi = () =>
  apiClient.post('/api/v1/thongbao/readThongBao_UserById', {}) as Promise<
    ApiEnvelope<{ notifications?: unknown[]; unreadCount?: number }>
  >;

export const markNotificationReadApi = (userId: number, thongbaoId: string) =>
  apiClient.post('/api/v1/thongbao/markThongBaoAsRead', {
    userid: userId,
    thongbaoId,
  }) as Promise<{ success?: boolean; newStatus?: boolean }>;

export const markAllNotificationsReadApi = (userId: number) =>
  apiClient.post('/api/v1/thongbao/markAllThongBaoAsRead', {
    userid: userId,
  }) as Promise<{ success?: boolean }>;
