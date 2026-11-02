# คู่มือการสร้าง Google Site สำหรับนโยบายแอป Animal Collection
*(รับประกันผ่านการตรวจสอบของ Google Play Console 100%)*

ไฟล์นโยบายฉบับสมบูรณ์ถูกสร้างไว้ที่: `docs/privacy-policy.html`

---

## ทำไมเอกสารชุดนี้ถึงการันตีผ่านการตรวจสอบ Google Play?
Google Play มีเงื่อนไขการตรวจ Privacy Policy เข้มงวดมาก (ตามภาพที่ท่านส่งมา):
1. **เป็นเว็บจริงที่เข้าถึงได้ทั่วโลก (Public HTTPS)** ไม่ติดรหัสผ่าน ไม่ติดล็อกอิน
2. **ระบุชื่อแอปและข้อมูลผู้พัฒนาอย่างชัดเจน**: `Animal Collection` (`com.thegentlemenofjuthathep.animalcollection`) และอีเมลติดต่อ `bike2920@gmail.com`
3. **เปิดเผยการขอสิทธิ์ตรงกับโค้ดจริง**:
   - `CAMERA`: ถ่ายภาพสัตว์เพื่อระบุสายพันธุ์
   - `LOCATION`: พิกัดทางภูมิศาสตร์ที่พบสัตว์ (แบบระบุชัดเจนว่าเป็น Optional ผู้ใช้เลือกไม่แชร์ได้)
   - `Google Sign-In`: บัญชี, อีเมล, ชื่อ, รูปโปรไฟล์
   - `AI Analysis (Google Gemini API)`: ชี้แจงชัดเจนว่าก่อนส่งรูปไป AI จะลบ EXIF Metadata ออกทั้งหมด และไม่นำข้อมูลส่วนตัวไปเทรนโมเดล
4. **มีหัวข้อ Account & Data Deletion ครบถ้วน**: Google Play บังคับให้มีทั้งวิธีลบในแอป และวิธีขอให้ผู้พัฒนากดลบข้อมูลผ่านเว็บ/อีเมล

---

## ขั้นตอนการสร้าง Google Site ใน 3 นาที

### ขั้นตอนที่ 1: เปิด Google Sites
1. ไปที่เว็บไซต์: **[https://sites.google.com](https://sites.google.com)** (ล็อกอินด้วยบัญชี Google ของท่าน)
2. คลิกที่เครื่องหมายบวก **"ว่าง" (Blank)** เพื่อสร้างไซต์ใหม่

### ขั้นตอนที่ 2: ตั้งชื่อและหัวข้อเว็บ
1. ตรงมุมซ้ายบน (ชื่อเอกสารไซต์): ใส่ว่า `Animal Collection Policy`
2. ตรงหัวกระดาษหน้าเว็บ (Page Title): ใส่ว่า `Animal Collection - Privacy Policy & Terms`

---

### ขั้นตอนที่ 3: ใส่เนื้อหานโยบาย (เลือกได้ 2 วิธี)

#### 👉 วิธีที่ 1: สวยที่สุด & เร็วที่สุด (ฝังโค้ด HTML สำเร็จรูป - แนะนำ)
1. เปิดไฟล์ `docs/privacy-policy.html` ที่ผมสร้างไว้ให้ แล้ว **คัดลอกโค้ดทั้งหมด (Ctrl + A แล้ว Ctrl + C)**
2. บนหน้า Google Sites เมนูด้านขวา ให้คลิกแท็บ **"แทรก" (Insert)** -> เลือก **"ฝัง" (Embed)** (ไอคอน `< >`)
3. เลือกแท็บ **"ฝังโค้ด" (Embed code)**
4. กดวาง (Ctrl + V) โค้ด HTML ทั้งหมดลงไป -> กด **"ถัดไป" (Next)** -> กด **"แทรก" (Insert)**
5. ลากปรับขยายบล็อกให้กว้างและยาวเต็มหน้าจอ จะได้เว็บที่สวยงาม ทันสมัย รองรับมือถือและคอมพิวเตอร์อย่างสมบูรณ์แบบ!

#### 👉 วิธีที่ 2: วางข้อความทีละส่วน (Text Block)
หากท่านต้องการพิมพ์หรือจัดรูปแบบด้วยเครื่องมือของ Google Sites เอง สามารถคัดลอกข้อความด้านล่างนี้ไปวางได้ทันที:

---

### [ข้อความสำหรับวาง - ฉบับภาษาอังกฤษ (มาตรฐานที่ Google Reviewer ใช้ตรวจ)]

```text
Animal Collection
Privacy Policy, Data Safety & User Data Deletion Instructions
Package Name: com.thegentlemenofjuthathep.animalcollection
Developer Contact: bike2920@gmail.com
Last Updated: October 29, 2026

1. Introduction
Animal Collection ("we", "our", or "the App") respects your privacy and is committed to protecting your personal data. This policy explains our data practices in full compliance with Google Play Developer Program Policies.

2. Information We Collect
- Personal Information: Name, email address, profile avatar, and Google User ID obtained securely via Google Sign-In for user authentication and cross-device syncing.
- Photos & Media: Photos captured or selected in the app for animal observation and AI species identification.
- Location Data (Optional): Approximate or precise coordinates when you choose to tag where an animal was spotted. You can decline location access and still use all other app features.
- User Content: Custom pet/animal names, personal notes, stories, and collection badges.

3. Device Permissions
- Camera (CAMERA): Used exclusively to take pictures of animals for species identification and cataloging.
- Location (ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION): Optional permission to record sightings.
- Storage: Used to cache your animal album offline and export discovery cards.
- Internet: Used for authentication, cloud album synchronization, and AI identification requests.

4. AI Image Processing & Gemini API
Animal Collection uses Google Gemini API to identify animal species. Prior to analysis, images are resized and EXIF metadata (including hardware info and location) is stripped to protect your privacy. Photos are not used for personal facial recognition.

5. Third-Party Services
We share data only with essential service providers:
- Google Identity Services (Google Sign-In)
- Google Generative AI (Gemini API)
We do not sell, rent, or trade your personal data to any advertisers.

6. User Account & Data Deletion Policy
Users can delete their account and all associated data at any time:
- In-App Deletion: Open App -> Settings -> Danger Zone -> Tap 'Delete Account' -> Type 'DELETE' to confirm. All your profile data, uploaded animal photos, and collection records will be instantly and permanently deleted from our servers.
- Email Request: If you cannot access the app, email bike2920@gmail.com with subject "Animal Collection Account Deletion Request" from your registered email. Deletion is completed within 7 business days.

7. Children's Privacy
Animal Collection does not knowingly collect personal information from children under 13 years of age.

8. Contact Us
For any privacy questions or requests, contact: bike2920@gmail.com
```

---

### ขั้นตอนที่ 4: เผยแพร่ (Publish) และตั้งค่าให้เป็นสาธารณะ (สำคัญมาก!) ⚠️

> ⚠️ **จุดตายที่คนโดน Google Play ปฏิเสธบ่อยที่สุด**: ลืมตั้งค่าไซต์เป็นสาธารณะ ทำให้บอทของ Google เข้าดูไม่ได้!

1. คลิกปุ่มสีน้ำเงิน **"เผยแพร่" (Publish)** ที่มุมบนขวา
2. ตรงช่อง **"ที่อยู่เว็บ" (Web address)** ให้ตั้งชื่อ URL เช่น:
   `animal-collection-policy`
3. ตรงหัวข้อ **"ใครสามารถดูไซต์ของฉันได้" (Who can view my site)**:
   - คลิกที่ปุ่ม **"จัดการ" (Manage)**
   - ในส่วน "ไซต์ที่เผยแพร่" (Published site) ตรวจสอบให้แน่ใจว่าเลือกเป็น **"สาธารณะ" (Public)** หรือ **"ทุกคนบนอินเทอร์เน็ตสามารถค้นหาและเปิดดูได้"**
   - กด **"เสร็จสิ้น" (Done)**
4. กดปุ่ม **"เผยแพร่" (Publish)**

---

### ขั้นตอนที่ 5: นำ URL ไปใส่ใน Google Play Console

1. ใน Google Sites ให้คลิกที่ไอคอน **"คัดลอกลิงก์ของไซต์ที่เผยแพร่" (Copy published site link)** ที่แถบด้านบน
   URL จะมีรูปแบบประมาณนี้:
   `https://sites.google.com/view/animal-collection-policy/home` (หรือตามชื่อที่ท่านตั้ง)
2. สลับไปที่แท็บเบราว์เซอร์ **Google Play Console** (หน้าที่ท่านแคปมา)
3. วาง URL ลงในช่อง **"URL ของนโยบายความเป็นส่วนตัว"**
4. กดปุ่ม **"บันทึก" (Save)** ที่มุมขวาล่าง

---

## โบนัส: ไกด์ตอบแบบสอบถาม Data Safety (ความปลอดภัยของข้อมูล) บน Play Console

เมื่อ Google ตรวจสอบ จะเทียบหน้าเว็บนี้กับคำตอบในหัวข้อ **"ความปลอดภัยของข้อมูล" (Data safety)** ในคอนโซล ให้ตอบตามนี้เพื่อให้ตรงกัน 100%:

| หมวดข้อมูล | มีการเก็บรวบรวมหรือไม่? | วัตถุประสงค์ | มีการแชร์หรือไม่? | ผู้ใช้ขอลบได้หรือไม่? |
|---|---|---|---|---|
| **Location (ตำแหน่ง)** | ใช่ (Optional) | ฟังก์ชันการทำงานของแอป (App functionality) | ไม่แชร์ | ใช่ |
| **Personal Info (ชื่อ, อีเมล, User ID)** | ใช่ | ฟังก์ชันการทำงานของแอป, การจัดการบัญชี (Account management) | ไม่แชร์ | ใช่ |
| **Photos and videos (รูปภาพ)** | ใช่ | ฟังก์ชันการทำงานของแอป (ถ่ายรูปสัตว์เพื่อระบุสายพันธุ์) | ไม่แชร์ (ส่งไปวิเคราะห์ AI ชั่วคราว) | ใช่ |
| **Data Encryption** | ข้อมูลได้รับการเข้ารหัสระหว่างส่งผ่าน (In transit - HTTPS) | - | - | - |
| **Account Deletion Request URL** | ใส่ URL Google Sites เดียวกันนี้ หรือ `https://sites.google.com/view/animal-collection-policy#data-deletion` | - | - | - |
