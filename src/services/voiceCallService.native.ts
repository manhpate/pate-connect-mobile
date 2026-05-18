import { PermissionsAndroid, Platform } from 'react-native';
import type { IRtcEngine, IRtcEngineEventHandler } from 'react-native-agora';
import { createChatGroupRoomRtcTokenApi } from './mobileApi';
import type { ActiveVoiceCall, StartVoiceCallParams } from './voiceCallService.shared';
import { getOneToOneVoiceChannelName } from './voiceCallService.shared';

let activeNativeEngine: IRtcEngine | null = null;
let activeNativeEventHandler: IRtcEngineEventHandler | null = null;

const requestNativeMicrophonePermission = async () => {
  if (Platform.OS !== 'android') return;

  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Bạn cần cấp quyền micro để bắt đầu cuộc gọi thoại.');
  }
};

export const stopActiveVoiceCall = async () => {
  const nativeEngine = activeNativeEngine;
  const nativeEventHandler = activeNativeEventHandler;
  activeNativeEngine = null;
  activeNativeEventHandler = null;

  if (!nativeEngine) return;

  if (nativeEventHandler) {
    nativeEngine.unregisterEventHandler(nativeEventHandler);
  }
  nativeEngine.leaveChannel();
  nativeEngine.release();
};

export const startOneToOneVoiceCall = async ({
  roomId,
  currentUserId,
  targetUserId,
  onConnectionStateChange,
  onRemoteUserCountChange,
}: StartVoiceCallParams): Promise<ActiveVoiceCall> => {
  await requestNativeMicrophonePermission();
  await stopActiveVoiceCall();

  const channelName = getOneToOneVoiceChannelName(roomId, currentUserId, targetUserId);
  const tokenResponse = await createChatGroupRoomRtcTokenApi(roomId, {
    targetUserId,
    channelName,
  });
  if (Number(tokenResponse?.EC) !== 0 || !tokenResponse?.DT?.token || !tokenResponse?.DT?.appId) {
    throw new Error(tokenResponse?.EM || 'Không lấy được token gọi thoại từ backend.');
  }

  const token = String(tokenResponse.DT.token || '');
  const appId = String(tokenResponse.DT.appId || '');
  const joinChannelName = String(tokenResponse.DT.channelName || channelName);
  const uid = Number(tokenResponse.DT.uid || currentUserId);
  const Agora = await import('react-native-agora');
  const engine = Agora.createAgoraRtcEngine();
  const remoteUsers = new Set<number>();
  const eventHandler: IRtcEngineEventHandler = {
    onJoinChannelSuccess: () => {
      onConnectionStateChange?.('CONNECTED');
      onRemoteUserCountChange?.(remoteUsers.size);
    },
    onUserJoined: (_connection, remoteUid) => {
      remoteUsers.add(remoteUid);
      onRemoteUserCountChange?.(remoteUsers.size);
    },
    onUserOffline: (_connection, remoteUid) => {
      remoteUsers.delete(remoteUid);
      onRemoteUserCountChange?.(remoteUsers.size);
    },
  };

  try {
    engine.initialize({
      appId,
      channelProfile: Agora.ChannelProfileType.ChannelProfileCommunication,
    });
    engine.registerEventHandler(eventHandler);
    engine.enableAudio();
    onConnectionStateChange?.('CONNECTING');

    const result = engine.joinChannel(token, joinChannelName, uid, {
      autoSubscribeAudio: true,
      autoSubscribeVideo: false,
      channelProfile: Agora.ChannelProfileType.ChannelProfileCommunication,
      clientRoleType: Agora.ClientRoleType.ClientRoleBroadcaster,
      publishCameraTrack: false,
      publishMicrophoneTrack: true,
    });

    if (result < 0) {
      throw new Error(`Agora không chấp nhận tham số cuộc gọi (${result}).`);
    }

    activeNativeEngine = engine;
    activeNativeEventHandler = eventHandler;
  } catch (error) {
    engine.unregisterEventHandler(eventHandler);
    engine.leaveChannel();
    engine.release();
    throw error;
  }

  return {
    channelName: joinChannelName,
    leave: stopActiveVoiceCall,
    setMuted: async (muted: boolean) => {
      engine.muteLocalAudioStream(muted);
    },
  };
};
