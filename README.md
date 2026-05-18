# Pate Connect

App mobile Android/iOS theo hướng chat-first cho In Vải Hà Nội Pate.

## Trạng thái hiện tại

- React Native + Expo
- 2 mode quyền:
  - khách hàng: chat nhóm, kho file, tài khoản
  - nội bộ: inbox đa kênh, nhóm chat, thông báo, tài khoản
- Đăng nhập thật bằng tài khoản `app.invaihn.vn`
- Dữ liệu chat nhóm, hội thoại, thông báo và kho file lấy trực tiếp từ `https://app.invaihn.vn`

## Chưa hoàn tất

- Đăng nhập Google native cho Android/iOS
- Upload file native từ app lên nhóm chat
- Mời email trực tiếp từ app mobile
- Socket/push realtime đầy đủ

## Cách chạy

```bash
npm install
npm run start
```

Lệnh hữu ích:

```bash
npm run android
npm run ios
npm run web
npm run typecheck
```

## Cấu hình gọi thoại Agora

Mobile không lưu RTC token cố định. Khi bấm gọi, app gọi backend:

```text
POST /api/chat-groups/rooms/:id/rtc-token
```

Backend cần cấu hình:

```bash
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate
AGORA_RTC_TOKEN_TTL_SECONDS=3600
```

Tính năng gọi thoại dùng `react-native-agora`, nên cần build app điện thoại bằng native build/custom dev build. Web preview chỉ hiển thị UI và channel test, cuộc gọi thật chạy trên app điện thoại.

## Cấu trúc

- `App.tsx`: root app
- `src/context`: session và state dùng dữ liệu thật
- `src/navigation`: stack + bottom tabs
- `src/screens`: các màn theo mode và màn dùng chung
- `src/components`: chat bubble, composer, file row, panel dùng lại
- `src/services`: axios client và API mobile
- `src/utils/mappers.ts`: chuẩn hóa payload backend sang kiểu dữ liệu mobile

## Bước tiếp theo nên làm

1. Nối Google native login cho khách hàng
2. Nối upload file native vào kho file nhóm
3. Nối socket/unread realtime
4. Bật push notification
