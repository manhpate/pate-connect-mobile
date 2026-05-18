export type { ActiveVoiceCall, StartVoiceCallParams } from './voiceCallService.shared';

import type { ActiveVoiceCall, StartVoiceCallParams } from './voiceCallService.shared';
import { getOneToOneVoiceChannelName } from './voiceCallService.shared';

export { getOneToOneVoiceChannelName };

export const stopActiveVoiceCall = async () => {};

export const startOneToOneVoiceCall = async ({
  roomId,
  currentUserId,
  targetUserId,
}: StartVoiceCallParams): Promise<ActiveVoiceCall> => {
  const channelName = getOneToOneVoiceChannelName(roomId, currentUserId, targetUserId);
  throw new Error(`Gọi thoại chỉ chạy trên app điện thoại. Kênh gọi đã tạo: ${channelName}`);
};
