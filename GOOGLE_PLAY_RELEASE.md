# Huong dan dua Pate Connect len Google Play

Ap dung cho du an Expo tai thu muc nay.

## Thong tin app hien tai

- Framework: Expo SDK 54, React Native 0.81.
- Android package: `invaihn.vn.pateconnect`.
- Ten hien tai: `Pate Connect`.
- Version hien tai: `1.0.0`.
- Android versionCode hien tai: `1`.
- File build can upload Google Play: Android App Bundle `.aab`.
- Quyen Android dang khai bao: `INTERNET`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`.
- Tinh nang can khai bao voi Google Play: dang nhap, chat, upload anh/tep, goi thoai bang micro, Firebase/Google login, Agora voice.

## 1. Chuan bi tai khoan

1. Tao Google Play Console developer account.
2. Tra phi dang ky mot lan 25 USD va xac minh danh tinh neu Google yeu cau.
3. Neu la tai khoan ca nhan moi, chuan bi toi thieu 12 tester cho closed test 14 ngay lien tuc truoc khi xin production access.
4. Tao hoac chuan bi tai khoan Expo/EAS de build app tren cloud.

Tai lieu Google:

- https://support.google.com/googleplay/android-developer/answer/6112435
- https://support.google.com/googleplay/android-developer/answer/14151465

## 2. Kiem tra moi truong local

May hien tai dang dung Node `20.19.0`, trong khi React Native 0.81 yeu cau toi thieu `20.19.4`. Nen nang Node len `20.19.4` hoac moi hon truoc khi build that.

Chay:

```powershell
cd D:\hoclaptrinh\HoiDan\du_an_chinh\pate-connect-mobile
node -v
npm install
npm run typecheck
npx expo-doctor
```

Ket qua mong muon:

- `npm run typecheck` khong bao loi.
- `npx expo-doctor` bao `17/17 checks passed`.

## 3. Cai EAS CLI va dang nhap

```powershell
npm install -g eas-cli
eas login
eas whoami
```

Neu chua lien ket project voi Expo:

```powershell
eas init
```

Lenh nay co the them `extra.eas.projectId` vao `app.json`. Neu co thay doi, giu lai thay doi do.

## 4. Build ban test APK

Truoc khi build ban production, tao APK de cai thu tren dien thoai Android:

```powershell
eas build --platform android --profile preview
```

Sau khi build xong, tai APK tu link EAS va test:

- Mo app lan dau.
- Dang nhap bang tai khoan `app.invaihn.vn`.
- Chat nhom va hoi thoai.
- Upload anh vao chat.
- Upload tep trong kho file.
- Goi thoai va cap quyen micro.
- Dang xuat/dang nhap lai.
- Tat/mat mang roi thu lai thao tac chinh.

## 5. Build ban production AAB

Khi test APK on, build file `.aab` de upload Google Play:

```powershell
eas build --platform android --profile production
```

Profile `production` trong `eas.json` da cau hinh `buildType: app-bundle`.

## 6. Tao app tren Google Play Console

1. Vao Play Console, chon Create app.
2. Chon ngon ngu mac dinh.
3. Nhap ten app: `Pate Connect`.
4. Chon app hay game: App.
5. Chon free/paid.
6. Tao app.

## 7. Hoan thanh Store listing

Can chuan bi:

- App name.
- Short description.
- Full description.
- App icon 512x512. Co the dung `assets/icon.png` nhung can export dung kich thuoc store neu Play Console yeu cau.
- Feature graphic 1024x500.
- It nhat 2 screenshot dien thoai Android.
- Contact email.
- Privacy policy URL.

Luu y: app co dang nhap, micro, upload anh/tep va SDK ben thu ba, nen nen co privacy policy URL rieng cho app. URL nay phai truy cap cong khai, khong can dang nhap.

## 8. Khai bao App content

Trong Play Console, vao App content va khai bao cac muc sau.

### App access

App co man dang nhap, nen chon app bi han che mot phan/toan bo va cung cap tai khoan test cho Google review.

Can tao 1 tai khoan test co du quyen:

- Dang nhap duoc.
- Xem chat.
- Test upload anh/tep neu tinh nang bat.
- Test goi thoai neu co the.

### Ads

Hien tai chua thay SDK quang cao trong app. Neu khong co quang cao, chon No.

### Content rating

Tra loi bang muc app lien lac/doanh nghiep. Neu app cho phep user gui noi dung tu do, khai bao dung muc user-generated content.

### Target audience

Neu app dung cho khach hang/doanh nghiep, khong huong toi tre em, chon nhom tuoi nguoi lon phu hop va khong tham gia Families.

### Data safety

Khai bao khop voi hanh vi that cua app va SDK:

- Co thu thap/xu ly thong tin tai khoan: ten, email, user id, token dang nhap.
- Co noi dung nguoi dung tao: tin nhan chat, anh, tep upload.
- Co file va anh do nguoi dung chon tu thiet bi.
- Co audio trong tinh nang goi thoai. Neu audio chi truyen realtime va khong luu, van khai bao theo dung luong du lieu duoc xu ly.
- Co SDK Firebase/Google login va Agora, can doc them tai lieu data safety cua cac SDK nay.
- Khai bao du lieu duoc truyen qua HTTPS/encryption in transit neu backend dung HTTPS.
- Khai bao cach xoa tai khoan/du lieu. Neu app chua co nut xoa tai khoan, can co huong dan lien he hoac trang deletion request.

Tai lieu Google:

- https://support.google.com/googleplay/android-developer/answer/10787469
- https://support.google.com/googleplay/android-developer/answer/9859455

## 9. Upload len testing track

Nen di theo thu tu:

1. Internal testing: upload `.aab`, moi vai tester noi bo, cai thu.
2. Closed testing: moi tester that.
3. Production: gui review sau khi closed test du dieu kien.

Voi tai khoan ca nhan moi, closed test can toi thieu 12 tester opt-in lien tuc trong 14 ngay.

## 10. Submit production

Sau khi test on:

1. Vao Production.
2. Create new release.
3. Upload `.aab` tu EAS production build.
4. Dien release notes.
5. Review release.
6. Send for review.

Google co the review tu vai gio den vai ngay. Neu bi reject, doc ly do trong Policy status, sua dung muc bi bao roi submit lai.

## 11. Moi lan update sau nay

Truoc moi ban moi, tang ca version va versionCode trong `app.json`:

```json
{
  "expo": {
    "version": "1.0.1",
    "android": {
      "versionCode": 2
    }
  }
}
```

Sau do build lai:

```powershell
npm run typecheck
npx expo-doctor
eas build --platform android --profile production
```

## 12. Cac diem can hoan thien truoc khi gui review

- Tao privacy policy URL cong khai.
- Tao tai khoan test cho Google review.
- Dam bao backend production `https://app.invaihn.vn` hoat dong on dinh.
- Kiem tra Firebase Android app co package `invaihn.vn.pateconnect` va SHA/key cau hinh dung neu Google login native duoc bat.
- Kiem tra Agora token endpoint production hoat dong.
- Chup screenshot tu ban Android release, khong dung anh web preview.
