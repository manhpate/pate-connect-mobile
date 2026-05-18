export type VoiceCallConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTING';

export interface StartVoiceCallParams {
  roomId: string;
  currentUserId: number;
  targetUserId: number;
  onConnectionStateChange?: (state: VoiceCallConnectionState) => void;
  onRemoteUserCountChange?: (count: number) => void;
}

export interface ActiveVoiceCall {
  channelName: string;
  leave: () => Promise<void>;
  setMuted: (muted: boolean) => Promise<void>;
}

const sanitizeChannelPart = (value: string | number) =>
  String(value)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 24);

export const getOneToOneVoiceChannelName = (roomId: string, userA: number, userB: number) => {
  const [firstUserId, secondUserId] = [userA, userB].sort((a, b) => a - b);
  return `room_${sanitizeChannelPart(roomId)}_u_${firstUserId}_${secondUserId}`.slice(0, 64);
};
