import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { AUTH_TOKEN_STORAGE_KEY } from '../config/appConfig';
import {
  checkAccountApi,
  ensureWebsiteChatGroupRoomApi,
  loginWithGoogleApi,
  loginWithPasswordApi,
  logoutApi,
  markAllNotificationsReadApi,
  markChatConversationReadApi,
  markChatGroupRoomReadApi,
  markNotificationReadApi,
  readChatConversationMessagesApi,
  readChatConversationsApi,
  readChatGroupRoomFilesApi,
  readChatGroupRoomInfoApi,
  readChatGroupRoomMessagesApi,
  readChatGroupRoomsApi,
  readNotificationsApi,
  removeMemberFromChatGroupRoomApi,
  sendChatConversationMessageApi,
  sendChatGroupMessageApi,
  updateChatGroupRoomInfoApi,
} from '../services/mobileApi';
import { setApiAccessToken } from '../services/apiClient';
import {
  AppAccount,
  AppMessage,
  ConversationSummary,
  GroupFile,
  GroupRoom,
  NotificationItem,
} from '../types/app';
import {
  mapAccount,
  mapAppMessage,
  mapConversationSummary,
  mapGroupFile,
  mapGroupRoom,
  mapNotificationItem,
} from '../utils/mappers';

type AuthState = 'loading' | 'signed_out' | 'ready';

interface SignInResult {
  ok: boolean;
  error?: string;
}

interface AppSessionContextValue {
  authState: AuthState;
  authError: string;
  currentUser: AppAccount | null;
  conversations: ConversationSummary[];
  rooms: GroupRoom[];
  notifications: NotificationItem[];
  signInWithPassword: (tenDangNhap: string, password: string) => Promise<SignInResult>;
  signInWithGoogleProfile: (profile: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
  }) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  refreshRooms: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  ensureCustomerPrimaryRoom: () => Promise<GroupRoom | null>;
  loadRoomDetail: (roomId: string) => Promise<GroupRoom | null>;
  loadRoomInfo: (roomId: string) => Promise<GroupRoom | null>;
  loadRoomFiles: (roomId: string) => Promise<GroupFile[]>;
  markRoomRead: (roomId: string) => Promise<void>;
  sendRoomMessage: (roomId: string, body: string) => Promise<AppMessage | null>;
  renameRoom: (roomId: string, nextName: string) => Promise<GroupRoom | null>;
  removeMemberFromRoom: (roomId: string, memberId: string) => Promise<GroupRoom | null>;
  loadConversationDetail: (conversationId: string) => Promise<ConversationSummary | null>;
  markConversationRead: (conversationId: string) => Promise<void>;
  sendConversationMessage: (conversationId: string, body: string) => Promise<AppMessage | null>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AppSessionContext = createContext<AppSessionContextValue | undefined>(undefined);

const sortRooms = (rooms: GroupRoom[]) => [...rooms].sort((a, b) => Number(b.id) - Number(a.id));

const upsertRoom = (rooms: GroupRoom[], room: GroupRoom) => {
  const index = rooms.findIndex((item) => item.id === room.id);
  if (index === -1) {
    return sortRooms([...rooms, room]);
  }

  const next = [...rooms];
  next[index] = {
    ...next[index],
    ...room,
    files: room.files.length > 0 ? room.files : next[index].files,
    messages: room.messages.length > 0 ? room.messages : next[index].messages,
    members: room.members.length > 0 ? room.members : next[index].members,
  };
  return sortRooms(next);
};

const upsertConversation = (conversations: ConversationSummary[], conversation: ConversationSummary) => {
  const index = conversations.findIndex((item) => item.id === conversation.id);
  if (index === -1) {
    return [conversation, ...conversations];
  }

  const next = [...conversations];
  next[index] = {
    ...next[index],
    ...conversation,
    messages: conversation.messages?.length ? conversation.messages : next[index].messages,
  };
  return next;
};

export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [authError, setAuthError] = useState('');
  const [currentUser, setCurrentUser] = useState<AppAccount | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [rooms, setRooms] = useState<GroupRoom[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const clearSessionState = useCallback(async () => {
    setApiAccessToken('');
    setCurrentUser(null);
    setConversations([]);
    setRooms([]);
    setNotifications([]);
    setAuthError('');
    setAuthState('signed_out');
    await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }, []);

  const refreshRoomsForUser = useCallback(async (userOverride?: AppAccount | null) => {
    const user = userOverride || currentUser;
    if (!user?.hasChatGroup) {
      setRooms([]);
      return;
    }

    const response = await readChatGroupRoomsApi();
    if (Number(response?.EC) !== 0) {
      throw new Error(response?.EM || 'Không tải được danh sách nhóm chat');
    }

    const nextRooms = Array.isArray(response?.DT?.rooms)
      ? response.DT.rooms.map((room) => mapGroupRoom((room || {}) as Record<string, unknown>))
      : [];

    setRooms(sortRooms(nextRooms));
    if (user.mode === 'customer' && !user.primaryRoomId && nextRooms[0]) {
      setCurrentUser((prev) => (prev ? { ...prev, primaryRoomId: Number(nextRooms[0].id) } : prev));
    }
  }, [currentUser]);

  const refreshConversationsForUser = useCallback(async (userOverride?: AppAccount | null) => {
    const user = userOverride || currentUser;
    if (!user?.canUseInbox) {
      setConversations([]);
      return;
    }

    const response = await readChatConversationsApi();
    if (Number(response?.EC) !== 0) {
      throw new Error(response?.EM || 'Không tải được danh sách hội thoại');
    }

    const nextConversations = Array.isArray(response?.DT?.conversations)
      ? response.DT.conversations.map((item) => mapConversationSummary((item || {}) as Record<string, unknown>))
      : [];
    setConversations(nextConversations);
  }, [currentUser]);

  const refreshNotificationsForUser = useCallback(async (userOverride?: AppAccount | null) => {
    const user = userOverride || currentUser;
    if (!user?.canUseNotifications) {
      setNotifications([]);
      return;
    }

    const response = await readNotificationsApi();
    if (Number(response?.EC) !== 0) {
      throw new Error(response?.EM || 'Không tải được thông báo');
    }

    const nextNotifications = Array.isArray(response?.DT?.notifications)
      ? response.DT.notifications.map((item) =>
          mapNotificationItem((item || {}) as Record<string, unknown>, user.mode),
        )
      : [];
    setNotifications(nextNotifications);
  }, [currentUser]);

  const ensureCustomerPrimaryRoomForUser = useCallback(async (userOverride?: AppAccount | null) => {
    const user = userOverride || currentUser;
    if (!user || user.mode !== 'customer') {
      return null;
    }

    const response = await ensureWebsiteChatGroupRoomApi();
    if (Number(response?.EC) !== 0 || !response?.DT?.room) {
      throw new Error(response?.EM || 'Không đảm bảo được nhóm chat của khách hàng');
    }

    const room = mapGroupRoom((response.DT.room || {}) as Record<string, unknown>);
    setRooms((prev) => upsertRoom(prev, room));
    setCurrentUser((prev) => (prev ? { ...prev, primaryRoomId: Number(room.id) || null } : prev));
    return room;
  }, [currentUser]);

  const hydrateAuthenticatedUser = useCallback(async (accountPayload: Record<string, unknown>, accessToken: string) => {
    setApiAccessToken(accessToken);
    await AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken);

    let user = mapAccount(accountPayload);
    if (!user) {
      throw new Error('Không đọc được thông tin tài khoản từ máy chủ');
    }

    if (user.mode === 'customer') {
      try {
        const response = await ensureWebsiteChatGroupRoomApi();
        if (Number(response?.EC) === 0 && response?.DT?.room) {
          const room = mapGroupRoom((response.DT.room || {}) as Record<string, unknown>);
          user = { ...user, primaryRoomId: Number(room.id) || null };
          setRooms((prev) => upsertRoom(prev, room));
        }
      } catch (error) {
        console.warn('Không đảm bảo được phòng chat website cho khách hàng:', error);
      }
    }

    setCurrentUser(user);
    setAuthState('ready');
    setAuthError('');

    await Promise.all([
      refreshRoomsForUser(user),
      refreshConversationsForUser(user),
      refreshNotificationsForUser(user),
    ]);

    return user;
  }, [refreshConversationsForUser, refreshNotificationsForUser, refreshRoomsForUser]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const storedToken = (await AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) || '';
        if (!storedToken) {
          if (!cancelled) {
            setAuthState('signed_out');
          }
          return;
        }

        setApiAccessToken(storedToken);
        const response = await checkAccountApi();
        if (Number(response?.EC) !== 0 || !response?.DT?.access_token) {
          await clearSessionState();
          return;
        }

        if (!cancelled) {
          await hydrateAuthenticatedUser(
            response.DT as Record<string, unknown>,
            String(response.DT.access_token || ''),
          );
        }
      } catch (error) {
        console.warn('Khởi tạo phiên mobile thất bại:', error);
        if (!cancelled) {
          await clearSessionState();
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [clearSessionState, hydrateAuthenticatedUser]);

  const signInWithPassword = useCallback(async (tenDangNhap: string, password: string) => {
    setAuthError('');
    try {
      const response = await loginWithPasswordApi(tenDangNhap.trim(), password);
      if (Number(response?.EC) !== 0 || !response?.DT?.access_token || !response?.DT?.account) {
        const error = response?.EM || 'Đăng nhập thất bại';
        setAuthError(error);
        return { ok: false, error };
      }

      await hydrateAuthenticatedUser(
        response.DT.account as Record<string, unknown>,
        String(response.DT.access_token || ''),
      );

      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không đăng nhập được';
      setAuthError(message);
      return { ok: false, error: message };
    }
  }, [hydrateAuthenticatedUser]);

  const signInWithGoogleProfile = useCallback(
    async (profile: { uid: string; email: string; displayName: string; photoURL?: string }) => {
      setAuthError('');
      try {
        const response = await loginWithGoogleApi(profile);
        if (Number(response?.EC) !== 0 || !response?.DT?.access_token || !response?.DT?.account) {
          const error = response?.EM || 'Đăng nhập Google thất bại';
          setAuthError(error);
          return { ok: false, error };
        }

        await hydrateAuthenticatedUser(
          response.DT.account as Record<string, unknown>,
          String(response.DT.access_token || ''),
        );

        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Không đăng nhập Google được';
        setAuthError(message);
        return { ok: false, error: message };
      }
    },
    [hydrateAuthenticatedUser],
  );

  const signOut = useCallback(async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.warn('Đăng xuất khỏi backend thất bại:', error);
    }
    await clearSessionState();
  }, [clearSessionState]);

  const refreshRooms = useCallback(async () => {
    await refreshRoomsForUser();
  }, [refreshRoomsForUser]);

  const refreshConversations = useCallback(async () => {
    await refreshConversationsForUser();
  }, [refreshConversationsForUser]);

  const refreshNotifications = useCallback(async () => {
    await refreshNotificationsForUser();
  }, [refreshNotificationsForUser]);

  const ensureCustomerPrimaryRoom = useCallback(async () => ensureCustomerPrimaryRoomForUser(), [ensureCustomerPrimaryRoomForUser]);

  const loadRoomDetail = useCallback(async (roomId: string) => {
    const response = await readChatGroupRoomMessagesApi(roomId);
    if (Number(response?.EC) !== 0 || !response?.DT?.room) {
      throw new Error(response?.EM || 'Không tải được nội dung nhóm chat');
    }

    const room = mapGroupRoom(
      (response.DT.room || {}) as Record<string, unknown>,
      {
        messages: Array.isArray(response?.DT?.messages)
          ? response.DT.messages.map((message) => mapAppMessage((message || {}) as Record<string, unknown>))
          : [],
      },
    );

    setRooms((prev) => upsertRoom(prev, room));
    return room;
  }, []);

  const loadRoomInfo = useCallback(async (roomId: string) => {
    const response = await readChatGroupRoomInfoApi(roomId);
    if (Number(response?.EC) !== 0 || !response?.DT?.room) {
      throw new Error(response?.EM || 'Không tải được thông tin nhóm');
    }

    const room = mapGroupRoom((response.DT.room || {}) as Record<string, unknown>);
    setRooms((prev) => upsertRoom(prev, room));
    return room;
  }, []);

  const loadRoomFiles = useCallback(async (roomId: string) => {
    const response = await readChatGroupRoomFilesApi(roomId);
    if (Number(response?.EC) !== 0) {
      throw new Error(response?.EM || 'Không tải được kho file của nhóm');
    }

    const files = Array.isArray(response?.DT?.assets)
      ? response.DT.assets.map((asset) => mapGroupFile((asset || {}) as Record<string, unknown>))
      : [];

    setRooms((prev) => {
      const index = prev.findIndex((room) => room.id === roomId);
      if (index === -1) return prev;
      const next = [...prev];
      next[index] = { ...next[index], files };
      return next;
    });
    return files;
  }, []);

  const markRoomRead = useCallback(async (roomId: string) => {
    setRooms((prev) => prev.map((room) => (room.id === roomId ? { ...room, unread: 0 } : room)));
    try {
      await markChatGroupRoomReadApi(roomId);
    } catch (error) {
      console.warn('Không đánh dấu đã đọc phòng chat được:', error);
    }
  }, []);

  const sendRoomMessage = useCallback(async (roomId: string, body: string) => {
    const cleanBody = body.trim();
    if (!cleanBody) return null;

    const response = await sendChatGroupMessageApi(roomId, cleanBody);
    if (Number(response?.EC) !== 0 || !response?.DT?.message) {
      throw new Error(response?.EM || 'Không gửi được tin nhắn nhóm');
    }

    const message = mapAppMessage((response.DT.message || {}) as Record<string, unknown>);
    setRooms((prev) =>
      prev.map((room) =>
        room.id === roomId
          ? {
              ...room,
              unread: 0,
              messages: [...room.messages, message],
            }
          : room,
      ),
    );
    await refreshRoomsForUser();
    return message;
  }, [refreshRoomsForUser]);

  const renameRoom = useCallback(async (roomId: string, nextName: string) => {
    const response = await updateChatGroupRoomInfoApi(roomId, { name: nextName.trim() });
    if (Number(response?.EC) !== 0 || !response?.DT?.room) {
      throw new Error(response?.EM || 'Không đổi được tên nhóm');
    }

    const room = mapGroupRoom((response.DT.room || {}) as Record<string, unknown>);
    setRooms((prev) => upsertRoom(prev, room));
    return room;
  }, []);

  const removeMemberFromRoom = useCallback(async (roomId: string, memberId: string) => {
    const response = await removeMemberFromChatGroupRoomApi(roomId, memberId);
    if (Number(response?.EC) !== 0 || !response?.DT?.room) {
      throw new Error(response?.EM || 'Không xóa được thành viên khỏi nhóm');
    }

    const room = mapGroupRoom((response.DT.room || {}) as Record<string, unknown>);
    setRooms((prev) => upsertRoom(prev, room));
    return room;
  }, []);

  const loadConversationDetail = useCallback(async (conversationId: string) => {
    const response = await readChatConversationMessagesApi(conversationId);
    if (Number(response?.EC) !== 0 || !response?.DT?.conversation) {
      throw new Error(response?.EM || 'Không tải được hội thoại');
    }

    const conversation = {
      ...mapConversationSummary((response.DT.conversation || {}) as Record<string, unknown>),
      messages: Array.isArray(response?.DT?.messages)
        ? response.DT.messages.map((message) => mapAppMessage((message || {}) as Record<string, unknown>))
        : [],
    };

    setConversations((prev) => upsertConversation(prev, conversation));
    return conversation;
  }, []);

  const markConversationRead = useCallback(async (conversationId: string) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unread: 0 } : conversation,
      ),
    );
    try {
      await markChatConversationReadApi(conversationId);
    } catch (error) {
      console.warn('Không đánh dấu đã đọc hội thoại được:', error);
    }
  }, []);

  const sendConversationMessage = useCallback(async (conversationId: string, body: string) => {
    const cleanBody = body.trim();
    if (!cleanBody) return null;

    const response = await sendChatConversationMessageApi(conversationId, cleanBody);
    if (Number(response?.EC) !== 0 || !response?.DT?.message) {
      throw new Error(response?.EM || 'Không gửi được phản hồi hội thoại');
    }

    const message = mapAppMessage((response.DT.message || {}) as Record<string, unknown>);
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              preview: message.body,
              lastMessageAt: message.sentAt,
              lastMessageAtRaw: message.sentAtRaw || null,
              unread: 0,
              messages: [...(conversation.messages || []), message],
            }
          : conversation,
      ),
    );
    await refreshConversationsForUser();
    return message;
  }, [refreshConversationsForUser]);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    if (!currentUser?.id) return;
    const current = notifications.find((item) => item.id === notificationId);
    if (!current || current.read) return;

    const response = await markNotificationReadApi(currentUser.id, notificationId);
    const nextRead = Boolean(response?.newStatus ?? true);
    setNotifications((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, read: nextRead } : item)),
    );
  }, [currentUser?.id, notifications]);

  const markAllNotificationsRead = useCallback(async () => {
    if (!currentUser?.id) return;
    await markAllNotificationsReadApi(currentUser.id);
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, [currentUser?.id]);

  const value = useMemo(
    () => ({
      authState,
      authError,
      currentUser,
      conversations,
      rooms,
      notifications,
      signInWithPassword,
      signInWithGoogleProfile,
      signOut,
      refreshConversations,
      refreshRooms,
      refreshNotifications,
      ensureCustomerPrimaryRoom,
      loadRoomDetail,
      loadRoomInfo,
      loadRoomFiles,
      markRoomRead,
      sendRoomMessage,
      renameRoom,
      removeMemberFromRoom,
      loadConversationDetail,
      markConversationRead,
      sendConversationMessage,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      authError,
      authState,
      conversations,
      currentUser,
      ensureCustomerPrimaryRoom,
      loadConversationDetail,
      loadRoomDetail,
      loadRoomFiles,
      loadRoomInfo,
      markAllNotificationsRead,
      markConversationRead,
      markNotificationRead,
      markRoomRead,
      notifications,
      refreshConversations,
      refreshNotifications,
      refreshRooms,
      removeMemberFromRoom,
      renameRoom,
      rooms,
      sendConversationMessage,
      sendRoomMessage,
      signInWithGoogleProfile,
      signInWithPassword,
      signOut,
    ],
  );

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
}

export function useAppSession() {
  const context = useContext(AppSessionContext);
  if (!context) {
    throw new Error('useAppSession must be used inside AppSessionProvider');
  }
  return context;
}
