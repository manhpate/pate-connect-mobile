import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { AUTH_TOKEN_STORAGE_KEY } from '../config/appConfig';
import {
  checkAccountApi,
  createPrivateChatGroupRoomApi,
  ensureWebsiteChatGroupRoomApi,
  inviteEmailsToChatGroupRoomApi,
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
  readNotificationsPageApi,
  removeMemberFromChatGroupRoomApi,
  sendChatConversationMessageApi,
  sendChatConversationImageApi,
  sendChatGroupImageApi,
  sendChatGroupMessageApi,
  updateChatGroupRoomInfoApi,
  uploadAccountAvatarApi,
  uploadChatGroupRoomFileApi,
} from '../services/mobileApi';
import { setApiAccessToken } from '../services/apiClient';
import { signInFirebaseWithBackendToken, signOutFirebase } from '../services/firebaseAuth';
import {
  AppAccount,
  AppMessage,
  Channel,
  ConversationSummary,
  GroupFile,
  GroupRoom,
  MessagePageState,
  NotificationItem,
  UploadFile,
  UploadImageFile,
} from '../types/app';
import { mergeMessagesChronologically } from '../utils/messageMerge';
import {
  mapAccount,
  mapAppMessage,
  mapConversationSummary,
  mapGroupFile,
  mapGroupRoom,
  mapNotificationItem,
  normalizeConversationCustomerName,
} from '../utils/mappers';

type AuthState = 'loading' | 'signed_out' | 'ready';

const CONVERSATION_PAGE_SIZE = 30;
const CONVERSATION_FILTER_PAGE_SIZE = 100;
const CONVERSATION_FILTER_MAX_PAGES = 3;
const CHAT_MESSAGE_PAGE_SIZE = 30;
const NOTIFICATION_PAGE_SIZE = 10;

interface SignInResult {
  ok: boolean;
  error?: string;
}

interface ListPaginationState {
  hasMore: boolean;
  loadingMore: boolean;
  nextOffset?: number | null;
  page?: number;
}

interface AppSessionContextValue {
  authState: AuthState;
  authError: string;
  currentUser: AppAccount | null;
  conversations: ConversationSummary[];
  rooms: GroupRoom[];
  notifications: NotificationItem[];
  conversationPagination: ListPaginationState;
  notificationPagination: ListPaginationState;
  signInWithPassword: (tenDangNhap: string, password: string) => Promise<SignInResult>;
  signInWithGoogleProfile: (profile: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
  }) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  uploadAccountAvatar: (image: UploadImageFile) => Promise<AppAccount | null>;
  refreshConversations: () => Promise<void>;
  loadMoreConversations: () => Promise<void>;
  loadConversationsUntilChannel: (channel: Channel) => Promise<boolean>;
  refreshRooms: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  ensureCustomerPrimaryRoom: () => Promise<GroupRoom | null>;
  loadRoomDetail: (roomId: string, options?: { beforeMessageId?: string | null }) => Promise<GroupRoom | null>;
  loadRoomInfo: (roomId: string) => Promise<GroupRoom | null>;
  loadRoomFiles: (roomId: string) => Promise<GroupFile[]>;
  uploadRoomFile: (roomId: string, file: UploadFile) => Promise<GroupFile | null>;
  markRoomRead: (roomId: string) => Promise<void>;
  sendRoomMessage: (roomId: string, body: string) => Promise<AppMessage | null>;
  sendRoomImage: (roomId: string, body: string, image: UploadImageFile) => Promise<AppMessage | null>;
  inviteEmailsToRoom: (roomId: string, emails: string[]) => Promise<GroupRoom | null>;
  createPrivateRoomFromMember: (sourceRoomId: string, targetUserId: number) => Promise<GroupRoom | null>;
  renameRoom: (roomId: string, nextName: string) => Promise<GroupRoom | null>;
  removeMemberFromRoom: (roomId: string, memberId: string) => Promise<GroupRoom | null>;
  loadConversationDetail: (conversationId: string, options?: { beforeMessageId?: string | null }) => Promise<ConversationSummary | null>;
  markConversationRead: (conversationId: string) => Promise<void>;
  sendConversationMessage: (conversationId: string, body: string) => Promise<AppMessage | null>;
  sendConversationImage: (conversationId: string, body: string, image: UploadImageFile) => Promise<AppMessage[]>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AppSessionContext = createContext<AppSessionContextValue | undefined>(undefined);

const sortRooms = (rooms: GroupRoom[]) => [...rooms].sort((a, b) => Number(b.id) - Number(a.id));
const sortConversations = (conversations: ConversationSummary[]) =>
  [...conversations].sort((a, b) => {
    const timeA = new Date(a.lastMessageAtRaw || 0).getTime();
    const timeB = new Date(b.lastMessageAtRaw || 0).getTime();
    const safeTimeA = Number.isNaN(timeA) ? 0 : timeA;
    const safeTimeB = Number.isNaN(timeB) ? 0 : timeB;
    if (safeTimeA !== safeTimeB) return safeTimeB - safeTimeA;
    return Number(b.id || 0) - Number(a.id || 0);
  });

const mergeConversations = (current: ConversationSummary[], incoming: ConversationSummary[]) => {
  const byId = new Map<string, ConversationSummary>();
  [...current, ...incoming].forEach((conversation) => {
    byId.set(conversation.id, {
      ...(byId.get(conversation.id) || {}),
      ...conversation,
    });
  });

  return sortConversations(Array.from(byId.values()));
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'EM' in error) {
    const message = String((error as { EM?: unknown }).EM || '').trim();
    if (message) return message;
  }
  return fallback;
};

const upsertRoom = (rooms: GroupRoom[], room: GroupRoom) => {
  const index = rooms.findIndex((item) => item.id === room.id);
  if (index === -1) {
    return sortRooms([...rooms, room]);
  }

  const next = [...rooms];
  const hasIncomingMessages = room.messages.length > 0;
  next[index] = {
    ...next[index],
    ...room,
    files: room.files.length > 0 ? room.files : next[index].files,
    messages: hasIncomingMessages ? room.messages : next[index].messages,
    hasMoreBefore: hasIncomingMessages ? room.hasMoreBefore : next[index].hasMoreBefore,
    nextBeforeMessageId: hasIncomingMessages ? room.nextBeforeMessageId : next[index].nextBeforeMessageId,
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
  const hasIncomingMessages = Boolean(conversation.messages?.length);
  next[index] = {
    ...next[index],
    ...conversation,
    messages: hasIncomingMessages ? conversation.messages : next[index].messages,
    hasMoreBefore: hasIncomingMessages ? conversation.hasMoreBefore : next[index].hasMoreBefore,
    nextBeforeMessageId: hasIncomingMessages ? conversation.nextBeforeMessageId : next[index].nextBeforeMessageId,
  };
  return next;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const envelope = error as { EM?: unknown; message?: unknown };
    const serverMessage = String(envelope.EM || envelope.message || '').trim();
    if (serverMessage) return serverMessage;
  }

  return fallback;
};

const mapMessagePageState = (pagination: Record<string, unknown> | undefined | null): MessagePageState => ({
  hasMoreBefore: Boolean(pagination?.hasMoreBefore),
  nextBeforeMessageId: pagination?.nextBeforeMessageId != null
    ? String(pagination.nextBeforeMessageId)
    : null,
});

export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [authError, setAuthError] = useState('');
  const [currentUser, setCurrentUser] = useState<AppAccount | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [rooms, setRooms] = useState<GroupRoom[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [conversationPagination, setConversationPagination] = useState<ListPaginationState>({
    hasMore: false,
    loadingMore: false,
    nextOffset: 0,
  });
  const [notificationPagination, setNotificationPagination] = useState<ListPaginationState>({
    hasMore: false,
    loadingMore: false,
    page: 1,
  });
  const currentUserRef = useRef<AppAccount | null>(null);
  const conversationsRef = useRef<ConversationSummary[]>([]);
  const conversationPaginationRef = useRef<ListPaginationState>({
    hasMore: false,
    loadingMore: false,
    nextOffset: 0,
  });
  const loadingMoreConversationsRef = useRef(false);
  const loadingMoreNotificationsRef = useRef(false);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    conversationPaginationRef.current = conversationPagination;
  }, [conversationPagination]);

  const clearSessionState = useCallback(async () => {
    try {
      await signOutFirebase();
    } catch (error) {
      console.warn('Đăng xuất Firebase thất bại:', error);
    }
    setApiAccessToken('');
    currentUserRef.current = null;
    setCurrentUser(null);
    setConversations([]);
    conversationsRef.current = [];
    setRooms([]);
    setNotifications([]);
    conversationPaginationRef.current = { hasMore: false, loadingMore: false, nextOffset: 0 };
    setConversationPagination({ hasMore: false, loadingMore: false, nextOffset: 0 });
    setNotificationPagination({ hasMore: false, loadingMore: false, page: 1 });
    setAuthError('');
    setAuthState('signed_out');
    await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }, []);

  const refreshRoomsForUser = useCallback(async (userOverride?: AppAccount | null) => {
    const user = userOverride || currentUserRef.current;
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
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const nextUser = { ...prev, primaryRoomId: Number(nextRooms[0].id) };
        currentUserRef.current = nextUser;
        return nextUser;
      });
    }
  }, []);

  const refreshConversationsForUser = useCallback(async (userOverride?: AppAccount | null) => {
    const user = userOverride || currentUserRef.current;
    if (!user?.canUseInbox) {
      setConversations([]);
      conversationsRef.current = [];
      conversationPaginationRef.current = { hasMore: false, loadingMore: false, nextOffset: 0 };
      setConversationPagination({ hasMore: false, loadingMore: false, nextOffset: 0 });
      return;
    }

    const response = await readChatConversationsApi({
      limit: CONVERSATION_PAGE_SIZE,
      offset: 0,
    });
    if (Number(response?.EC) !== 0) {
      throw new Error(response?.EM || 'Không tải được danh sách hội thoại');
    }

    const nextConversations = Array.isArray(response?.DT?.conversations)
      ? response.DT.conversations.map((item) => mapConversationSummary((item || {}) as Record<string, unknown>))
      : [];
    conversationsRef.current = nextConversations;
    setConversations(nextConversations);
    const pagination = response?.DT?.pagination || {};
    const nextPagination = {
      hasMore: Boolean(pagination.hasMore),
      loadingMore: false,
      nextOffset: typeof pagination.nextOffset === 'number' ? pagination.nextOffset : nextConversations.length,
    };
    conversationPaginationRef.current = nextPagination;
    setConversationPagination(nextPagination);
  }, []);

  const refreshNotificationsForUser = useCallback(async (userOverride?: AppAccount | null) => {
    const user = userOverride || currentUserRef.current;
    if (!user?.canUseNotifications) {
      setNotifications([]);
      setNotificationPagination({ hasMore: false, loadingMore: false, page: 1 });
      return;
    }

    const response = await readNotificationsPageApi(user.id, 1, NOTIFICATION_PAGE_SIZE);
    if (Number(response?.EC) !== 0) {
      throw new Error(response?.EM || 'Không tải được thông báo');
    }

    const rawNotifications = Array.isArray(response?.DT)
      ? response.DT
      : Array.isArray((response?.DT as { notifications?: unknown[] } | undefined)?.notifications)
        ? (response.DT as { notifications?: unknown[] }).notifications || []
        : [];

    const nextNotifications = rawNotifications.length > 0
      ? rawNotifications.map((item) =>
          mapNotificationItem((item || {}) as Record<string, unknown>, user.mode),
        )
      : [];
    setNotifications(nextNotifications);
    setNotificationPagination({
      hasMore: Boolean(response?.hasMore),
      loadingMore: false,
      page: 1,
    });
  }, []);

  const ensureCustomerPrimaryRoomForUser = useCallback(async (userOverride?: AppAccount | null) => {
    const user = userOverride || currentUserRef.current;
    if (!user || user.mode !== 'customer') {
      return null;
    }

    const response = await ensureWebsiteChatGroupRoomApi();
    if (Number(response?.EC) !== 0 || !response?.DT?.room) {
      throw new Error(response?.EM || 'Không đảm bảo được nhóm chat của khách hàng');
    }

    const room = mapGroupRoom((response.DT.room || {}) as Record<string, unknown>);
    setRooms((prev) => upsertRoom(prev, room));
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const nextUser = { ...prev, primaryRoomId: Number(room.id) || null };
      currentUserRef.current = nextUser;
      return nextUser;
    });
    return room;
  }, []);

  const hydrateAuthenticatedUser = useCallback(async (
    accountPayload: Record<string, unknown>,
    accessToken: string,
    firebaseToken?: string,
  ) => {
    await signInFirebaseWithBackendToken(firebaseToken);
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

    currentUserRef.current = user;
    setCurrentUser(user);
    setAuthState('ready');
    setAuthError('');

    const preloadResults = await Promise.allSettled([
      refreshRoomsForUser(user),
      refreshConversationsForUser(user),
      refreshNotificationsForUser(user),
    ]);
    preloadResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        const scope = ['nhóm chat', 'hội thoại', 'thông báo'][index] || 'dữ liệu';
        console.warn(`Không tải được ${scope} sau đăng nhập:`, result.reason);
      }
    });

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
        String(response.DT.firebase_token || ''),
      );

      return { ok: true };
    } catch (error) {
      const message = getErrorMessage(error, 'Không đăng nhập được');
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
          String(response.DT.firebase_token || ''),
        );

        return { ok: true };
      } catch (error) {
        const message = getErrorMessage(error, 'Không đăng nhập Google được');
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

  const uploadAccountAvatar = useCallback(async (image: UploadImageFile) => {
    const response = await uploadAccountAvatarApi(image);
    if (Number(response?.EC) !== 0) {
      throw new Error(response?.EM || 'Không cập nhật được ảnh đại diện');
    }

    const photoUrl = String(response?.DT?.photo_url || '').trim();
    if (!photoUrl) {
      throw new Error('Máy chủ chưa trả về ảnh đại diện mới');
    }

    const previousUser = currentUserRef.current;
    if (!previousUser) {
      return null;
    }

    const nextUser = {
      ...previousUser,
      photoUrl,
    };
    currentUserRef.current = nextUser;
    setCurrentUser(nextUser);
    return nextUser;
  }, []);

  const refreshRooms = useCallback(async () => {
    await refreshRoomsForUser();
  }, [refreshRoomsForUser]);

  const refreshConversations = useCallback(async () => {
    await refreshConversationsForUser();
  }, [refreshConversationsForUser]);

  const loadMoreConversations = useCallback(async () => {
    const user = currentUserRef.current;
    const currentPagination = conversationPaginationRef.current;
    const currentConversations = conversationsRef.current;
    if (
      !user?.canUseInbox ||
      loadingMoreConversationsRef.current ||
      currentPagination.loadingMore ||
      !currentPagination.hasMore
    ) {
      return;
    }

    loadingMoreConversationsRef.current = true;
    conversationPaginationRef.current = { ...currentPagination, loadingMore: true };
    setConversationPagination((prev) => ({ ...prev, loadingMore: true }));
    try {
      const offset = Number(currentPagination.nextOffset || currentConversations.length || 0);
      const response = await readChatConversationsApi({
        limit: CONVERSATION_PAGE_SIZE,
        offset,
      });
      if (Number(response?.EC) !== 0) {
        throw new Error(response?.EM || 'Không tải thêm được hội thoại');
      }

      const nextConversations = Array.isArray(response?.DT?.conversations)
        ? response.DT.conversations.map((item) => mapConversationSummary((item || {}) as Record<string, unknown>))
        : [];
      const pagination = response?.DT?.pagination || {};
      const mergedConversations = mergeConversations(conversationsRef.current, nextConversations);
      const nextPagination = {
        hasMore: Boolean(pagination.hasMore),
        loadingMore: false,
        nextOffset: typeof pagination.nextOffset === 'number'
          ? pagination.nextOffset
          : offset + nextConversations.length,
      };

      conversationsRef.current = mergedConversations;
      conversationPaginationRef.current = nextPagination;
      setConversations(mergedConversations);
      setConversationPagination(nextPagination);
    } catch (error) {
      console.warn('Không tải thêm được hội thoại:', error);
      conversationPaginationRef.current = { ...conversationPaginationRef.current, hasMore: false, loadingMore: false };
      setConversationPagination((prev) => ({ ...prev, hasMore: false, loadingMore: false }));
    } finally {
      loadingMoreConversationsRef.current = false;
    }
  }, []);

  const loadConversationsUntilChannel = useCallback(async (channel: Channel) => {
    const user = currentUserRef.current;
    if (!user?.canUseInbox) {
      return false;
    }

    if (conversationsRef.current.some((conversation) => conversation.channel === channel)) {
      return true;
    }

    if (loadingMoreConversationsRef.current || !conversationPaginationRef.current.hasMore) {
      return false;
    }

    loadingMoreConversationsRef.current = true;
    conversationPaginationRef.current = { ...conversationPaginationRef.current, loadingMore: true };
    setConversationPagination((prev) => ({ ...prev, loadingMore: true }));

    try {
      let nextConversations = conversationsRef.current;
      let nextPagination = conversationPaginationRef.current;
      let found = nextConversations.some((conversation) => conversation.channel === channel);

      for (let index = 0; index < CONVERSATION_FILTER_MAX_PAGES && !found && nextPagination.hasMore; index += 1) {
        const offset = Number(nextPagination.nextOffset || nextConversations.length || 0);
        const response = await readChatConversationsApi({
          limit: CONVERSATION_FILTER_PAGE_SIZE,
          offset,
        });
        if (Number(response?.EC) !== 0) {
          throw new Error(response?.EM || 'Không tải thêm được hội thoại');
        }

        const incoming = Array.isArray(response?.DT?.conversations)
          ? response.DT.conversations.map((item) => mapConversationSummary((item || {}) as Record<string, unknown>))
          : [];
        const pagination = response?.DT?.pagination || {};

        nextConversations = mergeConversations(nextConversations, incoming);
        found = nextConversations.some((conversation) => conversation.channel === channel);
        nextPagination = {
          hasMore: Boolean(pagination.hasMore),
          loadingMore: true,
          nextOffset: typeof pagination.nextOffset === 'number'
            ? pagination.nextOffset
            : offset + incoming.length,
        };

        conversationsRef.current = nextConversations;
        conversationPaginationRef.current = nextPagination;
        setConversations(nextConversations);

        if (incoming.length === 0 && !nextPagination.hasMore) {
          break;
        }
      }

      const settledPagination = { ...nextPagination, loadingMore: false };
      conversationPaginationRef.current = settledPagination;
      setConversationPagination(settledPagination);
      return found;
    } catch (error) {
      console.warn('Không tải thêm được hội thoại theo kênh:', error);
      conversationPaginationRef.current = { ...conversationPaginationRef.current, loadingMore: false };
      setConversationPagination((prev) => ({ ...prev, loadingMore: false }));
      return false;
    } finally {
      loadingMoreConversationsRef.current = false;
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    await refreshNotificationsForUser();
  }, [refreshNotificationsForUser]);

  const loadMoreNotifications = useCallback(async () => {
    const user = currentUserRef.current;
    if (
      !user?.canUseNotifications ||
      loadingMoreNotificationsRef.current ||
      notificationPagination.loadingMore ||
      !notificationPagination.hasMore
    ) {
      return;
    }

    loadingMoreNotificationsRef.current = true;
    setNotificationPagination((prev) => ({ ...prev, loadingMore: true }));
    const nextPage = Number(notificationPagination.page || 1) + 1;
    try {
      const response = await readNotificationsPageApi(user.id, nextPage, NOTIFICATION_PAGE_SIZE);
      if (Number(response?.EC) !== 0) {
        throw new Error(response?.EM || 'Không tải thêm được thông báo');
      }

      const nextNotifications = Array.isArray(response?.DT)
        ? response.DT.map((item) => mapNotificationItem((item || {}) as Record<string, unknown>, user.mode))
        : [];

      setNotifications((prev) => {
        const byId = new Map<string, NotificationItem>();
        [...prev, ...nextNotifications].forEach((item) => byId.set(item.id, item));
        return Array.from(byId.values());
      });
      setNotificationPagination({
        hasMore: Boolean(response?.hasMore),
        loadingMore: false,
        page: nextPage,
      });
    } catch (error) {
      console.warn('Không tải thêm được thông báo:', error);
      setNotificationPagination((prev) => ({ ...prev, hasMore: false, loadingMore: false }));
    } finally {
      loadingMoreNotificationsRef.current = false;
    }
  }, [
    notificationPagination.hasMore,
    notificationPagination.loadingMore,
    notificationPagination.page,
  ]);

  const ensureCustomerPrimaryRoom = useCallback(async () => ensureCustomerPrimaryRoomForUser(), [ensureCustomerPrimaryRoomForUser]);

  const loadRoomDetail = useCallback(async (roomId: string, options: { beforeMessageId?: string | null } = {}) => {
    const beforeMessageId = String(options.beforeMessageId || '').trim();
    const response = await readChatGroupRoomMessagesApi(roomId, {
      limit: CHAT_MESSAGE_PAGE_SIZE,
      beforeMessageId,
    });
    if (Number(response?.EC) !== 0 || !response?.DT?.room) {
      throw new Error(response?.EM || 'Không tải được nội dung nhóm chat');
    }

    const pagination = mapMessagePageState(response?.DT?.pagination as Record<string, unknown> | undefined);
    const room = mapGroupRoom(
      (response.DT.room || {}) as Record<string, unknown>,
      {
        messages: Array.isArray(response?.DT?.messages)
          ? response.DT.messages.map((message) => mapAppMessage((message || {}) as Record<string, unknown>))
          : [],
        hasMoreBefore: pagination.hasMoreBefore,
        nextBeforeMessageId: pagination.nextBeforeMessageId,
      },
    );

    setRooms((prev) => {
      const existing = prev.find((item) => item.id === room.id);
      if (!existing) return sortRooms([...prev, room]);

      const mergedRoom = {
        ...existing,
        ...room,
        files: existing.files.length ? existing.files : room.files,
        members: room.members.length ? room.members : existing.members,
        messages: beforeMessageId
          ? mergeMessagesChronologically(room.messages, existing.messages)
          : room.messages,
      };
      return upsertRoom(prev, mergedRoom);
    });
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

  const uploadRoomFile = useCallback(async (roomId: string, file: UploadFile) => {
    const response = await uploadChatGroupRoomFileApi(roomId, file);
    if (Number(response?.EC) !== 0 || !response?.DT?.asset) {
      throw new Error(response?.EM || 'Không upload được file');
    }

    const uploadedFile = mapGroupFile((response.DT.asset || {}) as Record<string, unknown>);
    setRooms((prev) => {
      const index = prev.findIndex((room) => room.id === roomId);
      if (index === -1) return prev;
      const next = [...prev];
      next[index] = {
        ...next[index],
        files: [uploadedFile, ...next[index].files.filter((item) => item.id !== uploadedFile.id)],
      };
      return next;
    });
    return uploadedFile;
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

  const sendRoomImage = useCallback(async (roomId: string, body: string, image: UploadImageFile) => {
    const response = await sendChatGroupImageApi(roomId, body.trim(), image);
    if (Number(response?.EC) !== 0 || !response?.DT?.message) {
      throw new Error(response?.EM || 'Không gửi được ảnh nhóm');
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

  const inviteEmailsToRoom = useCallback(async (roomId: string, emails: string[]) => {
    const cleanEmails = [...new Set(emails.map((email) => String(email || '').trim().toLowerCase()).filter(Boolean))];
    if (cleanEmails.length === 0) {
      throw new Error('Nhập ít nhất một email cần mời.');
    }

    let response;
    try {
      response = await inviteEmailsToChatGroupRoomApi(roomId, { emails: cleanEmails });
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Không mời được email vào nhóm'));
    }
    if (Number(response?.EC) !== 0 || !response?.DT?.room) {
      throw new Error(response?.EM || 'Không mời được email vào nhóm');
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

  const createPrivateRoomFromMember = useCallback(async (sourceRoomId: string, targetUserId: number) => {
    const response = await createPrivateChatGroupRoomApi(sourceRoomId, { targetUserId });
    if (Number(response?.EC) !== 0 || !response?.DT?.room) {
      throw new Error(response?.EM || 'Không tạo được nhóm nhắn riêng');
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

  const renameRoom = useCallback(async (roomId: string, nextName: string) => {
    let response;
    try {
      response = await updateChatGroupRoomInfoApi(roomId, { name: nextName.trim() });
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Không đổi được tên nhóm'));
    }
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

  const loadConversationDetail = useCallback(async (
    conversationId: string,
    options: { beforeMessageId?: string | null } = {},
  ) => {
    const beforeMessageId = String(options.beforeMessageId || '').trim();
    const response = await readChatConversationMessagesApi(conversationId, {
      limit: CHAT_MESSAGE_PAGE_SIZE,
      beforeMessageId,
    });
    if (Number(response?.EC) !== 0 || !response?.DT?.conversation) {
      throw new Error(response?.EM || 'Không tải được hội thoại');
    }

    const pagination = mapMessagePageState(response?.DT?.pagination as Record<string, unknown> | undefined);
    const messages = Array.isArray(response?.DT?.messages)
      ? response.DT.messages.map((message) => mapAppMessage((message || {}) as Record<string, unknown>))
      : [];
    const summary = mapConversationSummary((response.DT.conversation || {}) as Record<string, unknown>);
    const fallbackCustomerName = summary.customerName || normalizeConversationCustomerName({
      name: messages.find((message) => message.authorType === 'customer')?.authorName || '',
      customerId: '',
      channel: summary.channel,
      channelLabel: summary.title,
    });
    const conversation = {
      ...summary,
      customerName: fallbackCustomerName,
      title: fallbackCustomerName && !summary.customerName ? `${summary.title} | ${fallbackCustomerName}` : summary.title,
      messages,
      hasMoreBefore: pagination.hasMoreBefore,
      nextBeforeMessageId: pagination.nextBeforeMessageId,
    };

    setConversations((prev) => {
      const existing = prev.find((item) => item.id === conversation.id);
      if (!existing) return upsertConversation(prev, conversation);

      return upsertConversation(prev, {
        ...existing,
        ...conversation,
        messages: beforeMessageId
          ? mergeMessagesChronologically(conversation.messages || [], existing.messages || [])
          : conversation.messages,
      });
    });
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

  const sendConversationImage = useCallback(async (conversationId: string, body: string, image: UploadImageFile) => {
    const response = await sendChatConversationImageApi(conversationId, body.trim(), image);
    if (Number(response?.EC) !== 0 || (!response?.DT?.message && !response?.DT?.messages)) {
      throw new Error(response?.EM || 'Không gửi được ảnh hội thoại');
    }

    const messages = Array.isArray(response?.DT?.messages) && response.DT.messages.length > 0
      ? response.DT.messages.map((message) => mapAppMessage((message || {}) as Record<string, unknown>))
      : response?.DT?.message
        ? [mapAppMessage((response.DT.message || {}) as Record<string, unknown>)]
        : [];

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              preview: messages[messages.length - 1]?.body || conversation.preview,
              lastMessageAt: messages[messages.length - 1]?.sentAt || conversation.lastMessageAt,
              lastMessageAtRaw: messages[messages.length - 1]?.sentAtRaw || conversation.lastMessageAtRaw,
              unread: 0,
              messages: [...(conversation.messages || []), ...messages],
            }
          : conversation,
      ),
    );
    await refreshConversationsForUser();
    return messages;
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
      conversationPagination,
      notificationPagination,
      signInWithPassword,
      signInWithGoogleProfile,
      signOut,
      uploadAccountAvatar,
      refreshConversations,
      loadMoreConversations,
      loadConversationsUntilChannel,
      refreshRooms,
      refreshNotifications,
      loadMoreNotifications,
      ensureCustomerPrimaryRoom,
      loadRoomDetail,
      loadRoomInfo,
      loadRoomFiles,
      uploadRoomFile,
      markRoomRead,
      sendRoomMessage,
      sendRoomImage,
      inviteEmailsToRoom,
      createPrivateRoomFromMember,
      renameRoom,
      removeMemberFromRoom,
      loadConversationDetail,
      markConversationRead,
      sendConversationMessage,
      sendConversationImage,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      authError,
      authState,
      conversationPagination,
      conversations,
      currentUser,
      ensureCustomerPrimaryRoom,
      loadMoreConversations,
      loadConversationsUntilChannel,
      loadMoreNotifications,
      loadConversationDetail,
      loadRoomDetail,
      loadRoomFiles,
      loadRoomInfo,
      uploadRoomFile,
      createPrivateRoomFromMember,
      inviteEmailsToRoom,
      markAllNotificationsRead,
      markConversationRead,
      markNotificationRead,
      markRoomRead,
      notificationPagination,
      notifications,
      refreshConversations,
      refreshNotifications,
      refreshRooms,
      removeMemberFromRoom,
      renameRoom,
      rooms,
      sendConversationMessage,
      sendConversationImage,
      sendRoomImage,
      sendRoomMessage,
      signInWithGoogleProfile,
      signInWithPassword,
      signOut,
      uploadAccountAvatar,
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
