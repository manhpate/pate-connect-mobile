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

const mapChannel = (value: string, label = ''): Channel => {
  if (label.toLowerCase().includes('instagram')) return 'instagram';
  if (value === 'zalo_oa') return 'zalo';
  if (value === 'facebook_messenger') return 'facebook';
  return 'website';
};

export const getConversationChannelTitleLabel = (channel: Channel, label = '', rawChannel = '') => {
  if (channel === 'facebook') return 'FB';
  if (channel === 'instagram') return 'IG';
  if (channel === 'zalo') return 'Zalo OA';
  if (channel === 'website') return 'Web';
  return normalizeString(label || rawChannel, 'Hội thoại');
};

export const getConversationChannelShortLabel = (channel: Channel) => {
  if (channel === 'facebook') return 'FB';
  if (channel === 'instagram') return 'IG';
  if (channel === 'zalo') return 'ZALO';
  return 'WEB';
};

export const buildConversationTitle = ({
  channel,
  channelLabel,
  rawChannel,
  customerName,
}: {
  channel: Channel;
  channelLabel?: string;
  rawChannel?: string;
  customerName?: string;
}) => {
  const titleLabel = getConversationChannelTitleLabel(channel, channelLabel, rawChannel);
  return customerName ? `${titleLabel} | ${customerName}` : titleLabel;
};

export const normalizeConversationCustomerName = ({
  name,
  customerId,
  channel,
  channelLabel,
}: {
  name: string;
  customerId: string;
  channel: Channel;
  channelLabel: string;
}) => {
  const cleanName = normalizeString(name);
  const id = normalizeString(customerId);
  if (!cleanName) return '';

  const genericNames = [
    'facebook',
    'facebook messenger',
    'zalo',
    'zalo oa',
    'instagram',
    'instagram direct',
    'website',
    'khách website',
    'khách hàng',
    'người dùng',
    channelLabel,
  ]
    .map((item) => normalizeString(item).toLowerCase())
    .filter(Boolean);

  const lowerName = cleanName.toLowerCase();
  if (id && lowerName === id.toLowerCase()) return '';

  for (const genericName of genericNames) {
    if (lowerName === genericName) return '';
    if (id && lowerName === `${genericName} ${id.toLowerCase()}`) return '';
  }

  if (channel === 'facebook' || channel === 'instagram' || channel === 'zalo') {
    const idPattern = channel === 'zalo' ? /^zalo\s+\d+$/i : /^(facebook|instagram)\s+\d+$/i;
    if (idPattern.test(cleanName)) return '';
  }

  return cleanName;
};

const pickFirstString = (item: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = normalizeString(item[key]);
    if (value) return value;
  }
  return '';
};

const readRecord = (value: unknown) => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {});

const getNestedString = (item: Record<string, unknown>, path: string[]) => {
  let current: unknown = item;
  for (const key of path) {
    current = readRecord(current)[key];
  }
  return normalizeString(current);
};

const getWebsiteChatMeta = (meta: Record<string, unknown>) => {
  const websiteChat = readRecord(meta.website_chat);
  return Object.keys(websiteChat).length > 0 ? websiteChat : meta;
};

const getConversationMetaNameCandidate = (item: Record<string, unknown>) => {
  const meta = readRecord(item.meta);
  if (Object.keys(meta).length === 0) return '';

  const websiteMeta = getWebsiteChatMeta(meta);
  const candidates = [
    getNestedString(websiteMeta, ['saved_contact', 'display_name']),
    getNestedString(websiteMeta, ['profile', 'display_name']),
    getNestedString(websiteMeta, ['profile', 'name']),
    getNestedString(websiteMeta, ['google_identity', 'display_name']),
    getNestedString(websiteMeta, ['matched_user', 'username']),
    getNestedString(websiteMeta, ['matched_user', 'name']),
    getNestedString(meta, ['zalo_user_profile', 'display_name']),
    getNestedString(meta, ['zalo_user_profile', 'name']),
    getNestedString(meta, ['zalo_user_profile', 'user_display_name']),
    getNestedString(meta, ['zalo_user_info', 'display_name']),
    getNestedString(meta, ['zalo_user_info', 'name']),
    getNestedString(meta, ['user_info', 'display_name']),
    getNestedString(meta, ['user_info', 'name']),
    getNestedString(meta, ['profile', 'display_name']),
    getNestedString(meta, ['profile', 'name']),
    getNestedString(meta, ['sender', 'name']),
    getNestedString(meta, ['follower', 'name']),
  ];

  return candidates.find(Boolean) || '';
};

const getConversationCustomerNameCandidate = (item: Record<string, unknown>) => {
  const metaName = getConversationMetaNameCandidate(item);
  if (metaName) return metaName;

  const directName = pickFirstString(item, [
    'customer_name',
    'customer_full_name',
    'customer_display_name',
    'platform_customer_name',
    'platform_display_name',
    'contact_name',
    'profile_name',
    'display_name',
    'sender_name',
    'last_sender_name',
    'ten_khach_hang',
  ]);
  if (directName) return directName;

  for (const key of ['customer', 'khach_hang', 'contact', 'platform_customer']) {
    const nestedName = pickFirstString(readRecord(item[key]), [
      'name',
      'full_name',
      'display_name',
      'username',
      'ten',
      'ten_khach_hang',
    ]);
    if (nestedName) return nestedName;
  }

  return '';
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

const getMessageCustomerNameCandidate = (item: Record<string, unknown>) => {
  const rawPayload = readRecord(item.raw_payload);
  const graphMessage = readRecord(rawPayload.graph_api_message);
  const candidates = [
    getNestedString(graphMessage, ['from', 'name']),
    getNestedString(rawPayload, ['message', 'from', 'name']),
    getNestedString(rawPayload, ['sender', 'name']),
    getNestedString(rawPayload, ['follower', 'name']),
    getNestedString(rawPayload, ['user_info', 'display_name']),
    getNestedString(rawPayload, ['user_info', 'name']),
    getNestedString(rawPayload, ['profile', 'display_name']),
    getNestedString(rawPayload, ['profile', 'name']),
  ];

  return candidates.find(Boolean) || '';
};

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
  const belongsToPateCompany = Boolean(raw.thuoc_cong_ty_pate);
  const hasChatGroup = features.includes('CHAT_GROUP');
  const canUseInbox = belongsToPateCompany && (features.includes('CHAT_INBOX') || INTERNAL_GROUPS.has(groupName));
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
    belongsToPateCompany,
    primaryRoomId,
    canModerateGroups,
    canUseInbox,
    canUseNotifications: belongsToPateCompany && Boolean(raw.co_quyen_thong_bao),
    hasChatGroup,
  };
};

export const mapConversationSummary = (item: Record<string, unknown>): ConversationSummary => {
  const rawChannel = normalizeString(item.kenh);
  const channelLabel = normalizeString(item.kenh_label);
  const channel = mapChannel(rawChannel, channelLabel);
  const customerId = normalizeString(item.platform_customer_id || item.customer_id || item.external_customer_id);
  const meta = readRecord(item.meta);
  const customerName = normalizeConversationCustomerName({
    name: getConversationCustomerNameCandidate(item),
    customerId,
    channel,
    channelLabel,
  });
  const preview =
    normalizeString(item.last_message_text) ||
    (normalizeString(item.last_message_type) === 'attachment' ? '[Đã gửi tệp/ảnh]' : 'Chưa có nội dung');

  return {
    id: normalizeString(item.id),
    channel,
    rawChannel,
    customerName,
    title: buildConversationTitle({ channel, channelLabel, rawChannel, customerName }),
    meta,
    preview,
    lastMessageAt: formatDateTime(item.last_message_at as string | null, 'Mới đây'),
    lastMessageAtRaw: normalizeString(item.last_message_at) || null,
    unread: Number(item.unread_count || 0),
    aiStatus: mapAiStatus(item),
    statusLabel: normalizeString(item.status, 'moi'),
    canReply: Boolean(item.can_reply),
    canSendImages: Boolean(item.can_send_images),
    imageDisabledReason: normalizeString(item.send_image_disabled_reason),
    hasMoreBefore: Boolean(item.hasMoreBefore),
    nextBeforeMessageId: normalizeString(item.nextBeforeMessageId) || null,
  };
};

export const mapAppMessage = (item: Record<string, unknown>): AppMessage => {
  const attachments = Array.isArray(item.attachments)
    ? item.attachments.map((attachment) => mapAttachment((attachment || {}) as Record<string, unknown>))
    : [];
  const senderType = normalizeString(item.sender_type);
  const isMine = Boolean(item.is_mine);
  const authorType = mapMessageAuthorType(senderType, isMine);
  const authorName = authorType === 'customer'
    ? normalizeString(getMessageCustomerNameCandidate(item) || item.sender_name, 'Khách hàng')
    : normalizeString(item.sender_name, senderType === 'customer' ? 'Khách hàng' : 'Nhân viên');
  return {
    id: normalizeString(item.id),
    authorType,
    authorName,
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
    hasMoreBefore?: boolean;
    nextBeforeMessageId?: string | null;
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
    hasMoreBefore: Boolean(extras.hasMoreBefore),
    nextBeforeMessageId: extras.nextBeforeMessageId || null,
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
