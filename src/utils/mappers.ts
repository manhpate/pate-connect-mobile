import {
  AppAccount,
  AppMessage,
  Channel,
  ConversationSummary,
  FileKind,
  GroupFile,
  GroupMember,
  GroupRoom,
  MessageAttachment,
  NotificationItem,
  UserMode,
} from '../types/app';

const INTERNAL_GROUPS = new Set(['Nhóm Admin', 'Nhóm Kế Toán', 'Nhóm Kinh Doanh']);

const formatDateTime = (value?: string | null, fallback = 'Vừa xong') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
};

const normalizeString = (value: unknown, fallback = '') => {
  const next = String(value ?? '').trim();
  return next || fallback;
};

const stripHtml = (value: string) =>
  String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (!value) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
};

const mapChannel = (value: string): Channel => {
  if (value === 'zalo_oa') return 'zalo';
  if (value === 'facebook_messenger') return 'facebook';
  return 'website';
};

const mapAiStatus = (item: Record<string, unknown>) => {
  const status = normalizeString(item.status);
  const owner = normalizeString(item.thread_control_owner);
  if (status === 'da_dong' || status === 'closed') return 'closed' as const;
  if (owner === 'ai') return 'handoff' as const;
  return 'ready' as const;
};

const mapMessageAuthorType = (senderType: string, isMine = false) => {
  if (isMine) return 'me';
  if (senderType === 'customer') return 'customer';
  if (senderType === 'staff') return 'staff';
  if (senderType === 'ai') return 'ai';
  return 'system';
};

const mapAttachment = (item: Record<string, unknown>): MessageAttachment => ({
  id: normalizeString(item.id),
  type: normalizeString(item.type),
  url: normalizeString(item.url),
  previewUrl: normalizeString(item.preview_url),
  name: normalizeString(item.name),
  mimeType: normalizeString(item.mime_type),
  sizeBytes: Number(item.size_bytes || 0),
});

export const mapAccount = (
  payload: Record<string, unknown> | undefined | null,
  primaryRoomId: number | null = null,
): AppAccount | null => {
  const raw = payload || {};
  const group = (raw.nhomVaQuyen || {}) as Record<string, unknown>;
  const features = Array.isArray(raw.chucNangs)
    ? raw.chucNangs
        .map((item) => normalizeString((item as Record<string, unknown>)?.ma))
        .filter(Boolean)
    : [];
  const groupName = normalizeString(group.ten_nhom, 'Người dùng');
  const mode: UserMode = groupName === 'Nhóm Khách Hàng' ? 'customer' : 'internal';
  const hasChatGroup = features.includes('CHAT_GROUP');
  const canUseInbox = features.includes('CHAT_INBOX') || INTERNAL_GROUPS.has(groupName);
  const canModerateGroups = groupName === 'Nhóm Admin' || features.includes('QUYEN_ADMIN');

  return {
    id: Number(raw.id || 0),
    email: normalizeString(raw.email),
    username: normalizeString(raw.username, 'Người dùng'),
    photoUrl: normalizeString(raw.photo_url) || null,
    mode,
    roleLabel: groupName,
    permissions: features,
    groupId: Number(group.id || 0) || null,
    groupName,
    primaryRoomId,
    canModerateGroups,
    canUseInbox,
    canUseNotifications: Boolean(raw.co_quyen_thong_bao),
    hasChatGroup,
  };
};

export const mapConversationSummary = (item: Record<string, unknown>): ConversationSummary => {
  const rawChannel = normalizeString(item.kenh);
  const channel = mapChannel(rawChannel);
  const customerName = normalizeString(item.customer_name, 'Khách hàng');
  const preview =
    normalizeString(item.last_message_text) ||
    (normalizeString(item.last_message_type) === 'attachment' ? '[Đã gửi tệp/ảnh]' : 'Chưa có nội dung');

  return {
    id: normalizeString(item.id),
    channel,
    rawChannel,
    customerName,
    title: `${item.kenh_label ? normalizeString(item.kenh_label) : rawChannel} | ${customerName}`,
    preview,
    lastMessageAt: formatDateTime(item.last_message_at as string | null, 'Mới đây'),
    lastMessageAtRaw: normalizeString(item.last_message_at) || null,
    unread: Number(item.unread_count || 0),
    aiStatus: mapAiStatus(item),
    statusLabel: normalizeString(item.status, 'moi'),
    canReply: Boolean(item.can_reply),
  };
};

export const mapAppMessage = (item: Record<string, unknown>): AppMessage => {
  const attachments = Array.isArray(item.attachments)
    ? item.attachments.map((attachment) => mapAttachment((attachment || {}) as Record<string, unknown>))
    : [];
  const senderType = normalizeString(item.sender_type);
  const isMine = Boolean(item.is_mine);
  return {
    id: normalizeString(item.id),
    authorType: mapMessageAuthorType(senderType, isMine),
    authorName: normalizeString(item.sender_name, senderType === 'customer' ? 'Khách hàng' : 'Nhân viên'),
    body: normalizeString(item.message_text, attachments.length > 0 ? '[Đã gửi tệp/ảnh]' : '[Tin nhắn trống]'),
    sentAt: formatDateTime(item.sent_at as string | null),
    sentAtRaw: normalizeString(item.sent_at) || null,
    attachments,
    isMine,
  };
};

export const mapConversationMessage = mapAppMessage;

const mapRoomAccentColor = (room: Record<string, unknown>) => {
  const meta = (room.meta || {}) as Record<string, unknown>;
  if (meta.auto_customer_room) return '#0d7a6f';
  if (normalizeString(room.current_member_role) === 'owner') return '#4a83ff';
  return '#0d7a6f';
};

export const mapGroupMember = (item: Record<string, unknown>): GroupMember => ({
  id: normalizeString(item.id),
  userId: Number(item.user_id || 0) || null,
  name: normalizeString(item.display_name || item.username, normalizeString(item.email, 'Thành viên')),
  email: normalizeString(item.email),
  role: normalizeString(item.role, 'member'),
  status: normalizeString(item.status, 'active'),
  joinedAt: normalizeString(item.joined_at) || null,
  canRemove: Boolean(item.can_remove),
  online: normalizeString(item.status, 'active') === 'active',
});

export const mapGroupRoom = (
  room: Record<string, unknown>,
  extras: {
    messages?: AppMessage[];
    files?: GroupFile[];
  } = {},
): GroupRoom => {
  const meta = ((room.meta || {}) as Record<string, unknown>) || {};
  const members = Array.isArray(room.members)
    ? room.members.map((member) => mapGroupMember((member || {}) as Record<string, unknown>))
    : [];

  return {
    id: normalizeString(room.id),
    name: normalizeString(room.name, 'Chat nhóm'),
    description:
      normalizeString(room.description) ||
      (normalizeString(meta.origin) === 'website_auto'
        ? 'Nhóm chăm sóc khách từ invaihn.vn'
        : 'Nhóm chat đang hoạt động'),
    unread: Number(room.unread_count || 0),
    accentColor: mapRoomAccentColor(room),
    memberCount: Number(room.member_count || members.length),
    members,
    files: extras.files || [],
    messages: extras.messages || [],
    canManageMembers: Boolean(room.can_manage_members),
    canEditRoom: Boolean(room.can_edit_room),
    canRemoveMembers: Boolean(room.can_remove_members),
  };
};

const mapFileKind = (mimeType: string, fileName: string): FileKind => {
  const mime = normalizeString(mimeType).toLowerCase();
  const name = normalizeString(fileName).toLowerCase();
  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|tiff?)$/i.test(name)) return 'image';
  if (/\.(ai|psd|svg|cdr|eps)$/i.test(name)) return 'design';
  return 'document';
};

const formatFileSize = (sizeBytes: number) => {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return '0 B';
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  if (sizeBytes < 1024 * 1024 * 1024) return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const mapGroupFile = (item: Record<string, unknown>): GroupFile => {
  const sizeBytes = Number(item.size || 0);
  const name = normalizeString(item.name || item.file_name, 'tap-tin');
  const mimeType = normalizeString(item.mime_type);
  return {
    id: normalizeString(item.id),
    name,
    sizeLabel: formatFileSize(sizeBytes),
    sizeBytes,
    uploadedBy: normalizeString(item.uploader_name, 'Không rõ'),
    uploadedAt: formatDateTime(item.uploaded_at as string | null, 'Vừa xong'),
    uploadedAtRaw: normalizeString(item.uploaded_at) || null,
    kind: mapFileKind(mimeType, name),
    status: normalizeString(item.status) === 'ready' ? 'ready' : 'uploading',
    downloadUrl: normalizeString(item.download_url || item.url),
  };
};

export const mapNotificationItem = (
  item: Record<string, unknown>,
  mode: UserMode,
): NotificationItem => {
  const thongBao = (item.thongbao || {}) as Record<string, unknown>;
  const tinNhan = parseJson<Record<string, unknown>>(thongBao.tin_nhan, {});
  const htmlBody = normalizeString(tinNhan.html);
  const body =
    normalizeString(tinNhan.text) ||
    stripHtml(htmlBody) ||
    'Bạn có thông báo mới từ hệ thống.';
  const title = normalizeString(thongBao.kieu_tn || thongBao.ten_nhom, 'Thông báo');

  return {
    id: normalizeString(item.thongbao_id || item.id),
    title,
    body,
    timestamp: formatDateTime((item.createdAt || thongBao.createdAt) as string | null, 'Mới đây'),
    timestampRaw: normalizeString(item.createdAt || thongBao.createdAt) || null,
    scope: mode,
    read: Boolean(item.xn_doc),
  };
};
