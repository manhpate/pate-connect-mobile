export type UserMode = 'customer' | 'internal';
export type Channel = 'website' | 'zalo' | 'facebook' | 'instagram';
export type MessageAuthorType = 'customer' | 'staff' | 'ai' | 'system' | 'me';
export type FileKind = 'image' | 'design' | 'document';

export interface AppAccount {
  id: number;
  email: string;
  username: string;
  photoUrl: string | null;
  mode: UserMode;
  roleLabel: string;
  permissions: string[];
  groupId: number | null;
  groupName: string;
  belongsToPateCompany: boolean;
  primaryRoomId: number | null;
  canModerateGroups: boolean;
  canUseInbox: boolean;
  canUseNotifications: boolean;
  hasChatGroup: boolean;
}

export interface MessageAttachment {
  id?: string;
  type?: string;
  url?: string;
  previewUrl?: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface UploadFile {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  file?: unknown;
}

export interface UploadImageFile extends UploadFile {}

export interface AppMessage {
  id: string;
  authorType: MessageAuthorType;
  authorName: string;
  body: string;
  sentAt: string;
  sentAtRaw?: string | null;
  attachments: MessageAttachment[];
  isMine?: boolean;
}

export interface ConversationSummary {
  id: string;
  channel: Channel;
  rawChannel: string;
  customerName: string;
  title: string;
  preview: string;
  lastMessageAt: string;
  lastMessageAtRaw?: string | null;
  unread: number;
  aiStatus: 'ready' | 'handoff' | 'closed';
  statusLabel: string;
  canReply: boolean;
  canSendImages: boolean;
  imageDisabledReason: string;
  messages?: AppMessage[];
}

export interface GroupMember {
  id: string;
  userId: number | null;
  name: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string | null;
  canRemove: boolean;
  online: boolean;
}

export interface GroupFile {
  id: string;
  name: string;
  sizeLabel: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
  uploadedAtRaw?: string | null;
  kind: FileKind;
  status: 'ready' | 'uploading' | 'error';
  downloadUrl?: string;
}

export interface GroupRoom {
  id: string;
  name: string;
  description: string;
  unread: number;
  accentColor: string;
  memberCount: number;
  members: GroupMember[];
  files: GroupFile[];
  messages: AppMessage[];
  canManageMembers: boolean;
  canEditRoom: boolean;
  canRemoveMembers: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  timestampRaw?: string | null;
  scope: UserMode | 'all';
  read: boolean;
}

export type RootStackParamList = {
  Welcome: undefined;
  CustomerShell: undefined;
  InternalShell: undefined;
  Conversation: { conversationId: string };
  GroupChat: { roomId: string };
  GroupInfo: { roomId: string };
  FileVault: { roomId: string };
};

export type CustomerTabParamList = {
  CustomerChat: undefined;
  CustomerFiles: undefined;
  Profile: undefined;
};

export type InternalTabParamList = {
  Inbox: undefined;
  Groups: undefined;
  Alerts: undefined;
  Profile: undefined;
};
