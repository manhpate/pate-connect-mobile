import googleServicesJson from '../../google-services.json';

type GoogleOAuthClient = {
  client_id?: string;
  client_type?: number;
  android_info?: {
    package_name?: string;
    certificate_hash?: string;
  };
};

type GoogleServicesClient = {
  client_info?: {
    android_client_info?: {
      package_name?: string;
    };
  };
  oauth_client?: GoogleOAuthClient[];
};

type GoogleServicesConfig = {
  client?: GoogleServicesClient[];
};

const GOOGLE_SERVICES_CONFIG = googleServicesJson as GoogleServicesConfig;
const ANDROID_PACKAGE_NAME = 'invaihn.vn.pateconnect';
const MISSING_ANDROID_CLIENT_ID = 'missing-android-oauth-client-id.apps.googleusercontent.com';

const clean = (value?: string) => String(value || '').trim();

const findAndroidClientIdFromGoogleServices = () => {
  const matchingFirebaseClient = GOOGLE_SERVICES_CONFIG.client?.find(
    (client) => client.client_info?.android_client_info?.package_name === ANDROID_PACKAGE_NAME,
  );

  const androidOAuthClient =
    matchingFirebaseClient?.oauth_client?.find((client) => client.client_type === 1 && clean(client.client_id)) ||
    GOOGLE_SERVICES_CONFIG.client
      ?.flatMap((client) => client.oauth_client || [])
      .find(
        (client) =>
          client.client_type === 1 &&
          client.android_info?.package_name === ANDROID_PACKAGE_NAME &&
          clean(client.client_id),
      );

  return clean(androidOAuthClient?.client_id);
};

export const GOOGLE_WEB_CLIENT_ID = '1001728301885-v8vq8lipg0gqr43e4bfv7c22uclatj59.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = '1001728301885-aauals89uci3boope87sdqsqvejdkgtv.apps.googleusercontent.com';

export const GOOGLE_ANDROID_CLIENT_ID =
  clean(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID) || findAndroidClientIdFromGoogleServices();

export const IS_GOOGLE_ANDROID_CONFIGURED =
  GOOGLE_ANDROID_CLIENT_ID.endsWith('.apps.googleusercontent.com') && GOOGLE_ANDROID_CLIENT_ID !== GOOGLE_WEB_CLIENT_ID;

export const GOOGLE_ANDROID_CLIENT_ID_FOR_REQUEST = IS_GOOGLE_ANDROID_CONFIGURED
  ? GOOGLE_ANDROID_CLIENT_ID
  : MISSING_ANDROID_CLIENT_ID;

export const GOOGLE_ANDROID_CONFIG_ERROR =
  'Google Login Android chưa được cấu hình. Hãy thêm SHA-1/SHA-256 từ Play Console vào Firebase, tải lại google-services.json rồi build bản mới.';
