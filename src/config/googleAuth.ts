export const GOOGLE_WEB_CLIENT_ID = '1001728301885-v8vq8lipg0gqr43e4bfv7c22uclatj59.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = '1001728301885-aauals89uci3boope87sdqsqvejdkgtv.apps.googleusercontent.com';

// Firebase chưa có Android OAuth client riêng vì app Android mới chưa thêm SHA-1/SHA-256.
// Tạm thời dùng web client để thử flow browser-based trên môi trường dev.
export const GOOGLE_ANDROID_CLIENT_ID = GOOGLE_WEB_CLIENT_ID;
