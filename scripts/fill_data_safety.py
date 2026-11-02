# scripts/fill_data_safety.py
import csv
import io

raw_csv = """Question ID (machine readable),Response ID (machine readable),Response value,Answer requirement,Human-friendly question label
PSL_DATA_COLLECTION_COLLECTS_PERSONAL_DATA,,true,REQUIRED,แอปของคุณรวบรวมหรือแชร์ประเภทข้อมูลผู้ใช้ที่จำเป็นหรือไม่
PSL_DATA_COLLECTION_ENCRYPTED_IN_TRANSIT,,true,MAYBE_REQUIRED,ข้อมูลผู้ใช้ทั้งหมดที่แอปของคุณรวบรวมได้รับการเข้ารหัสระหว่างการส่งหรือไม่
PSL_SUPPORTED_ACCOUNT_CREATION_METHODS,PSL_ACM_USER_ID_PASSWORD,,MULTIPLE_CHOICE,แอปของคุณรองรับวิธีการสร้างบัญชีใดต่อไปนี้ เลือกได้มากกว่า 1 ข้อ / ชื่อผู้ใช้และรหัสผ่าน
PSL_SUPPORTED_ACCOUNT_CREATION_METHODS,PSL_ACM_USER_ID_OTHER_AUTH,,MULTIPLE_CHOICE,แอปของคุณรองรับวิธีการสร้างบัญชีใดต่อไปนี้ เลือกได้มากกว่า 1 ข้อ / ชื่อผู้ใช้และการตรวจสอบสิทธิ์อื่นๆ
PSL_SUPPORTED_ACCOUNT_CREATION_METHODS,PSL_ACM_USER_ID_PASSWORD_OTHER_AUTH,,MULTIPLE_CHOICE,แอปของคุณรองรับวิธีการสร้างบัญชีใดต่อไปนี้ เลือกได้มากกว่า 1 ข้อ / ชื่อผู้ใช้ รหัสผ่าน และการตรวจสอบสิทธิ์อื่นๆ
PSL_SUPPORTED_ACCOUNT_CREATION_METHODS,PSL_ACM_OAUTH,true,MULTIPLE_CHOICE,แอปของคุณรองรับวิธีการสร้างบัญชีใดต่อไปนี้ เลือกได้มากกว่า 1 ข้อ / OAuth
PSL_SUPPORTED_ACCOUNT_CREATION_METHODS,PSL_ACM_OTHER,,MULTIPLE_CHOICE,แอปของคุณรองรับวิธีการสร้างบัญชีใดต่อไปนี้ เลือกได้มากกว่า 1 ข้อ / อื่นๆ
PSL_SUPPORTED_ACCOUNT_CREATION_METHODS,PSL_ACM_NONE,,MULTIPLE_CHOICE,แอปของคุณรองรับวิธีการสร้างบัญชีใดต่อไปนี้ เลือกได้มากกว่า 1 ข้อ / แอปของฉันไม่อนุญาตให้ผู้ใช้สร้างบัญชี
PSL_ACM_SPECIFY,,,MAYBE_REQUIRED,อธิบายวิธีการสร้างบัญชีที่แอปของคุณรองรับ
PSL_ACCOUNT_DELETION_URL,,https://sites.google.com/view/animalcollectionpolicy,MAYBE_REQUIRED,เพิ่มลิงก์ที่ผู้ใช้สามารถใช้เพื่อขอลบบัญชีและข้อมูลที่เกี่ยวข้องของตนได้ 
PSL_SUPPORT_DATA_DELETION_BY_USER,DATA_DELETION_YES,true,SINGLE_CHOICE,คุณมีตัวเลือกให้ผู้ใช้ขอลบข้อมูลของตนเองหรือไม่ / ใช่
PSL_SUPPORT_DATA_DELETION_BY_USER,DATA_DELETION_NO,,SINGLE_CHOICE,คุณมีตัวเลือกให้ผู้ใช้ขอลบข้อมูลของตนเองหรือไม่ / ไม่
PSL_SUPPORT_DATA_DELETION_BY_USER,DATA_DELETION_NO_AUTO_DELETED,,SINGLE_CHOICE,คุณมีตัวเลือกให้ผู้ใช้ขอลบข้อมูลของตนเองหรือไม่ / ไม่มี แต่ข้อมูลผู้ใช้จะถูกลบโดยอัตโนมัติภายใน 90 วัน
PSL_DATA_DELETION_URL,,https://sites.google.com/view/animalcollectionpolicy,MAYBE_REQUIRED,ลบ URL ของข้อมูล
PSL_DATA_COLLECTION_COMPLIES_FAMILY_POLICY,,,OPTIONAL,ตอบคำถามข้อนี้ก็ต่อเมื่อคุณได้ระบุว่ากลุ่มอายุเป้าหมายของแอปรวมเด็กๆ ด้วย หรือเมื่อคุณเลือกเข้าร่วมโปรแกรมออกแบบเพื่อครอบครัว หากคุณเลือกข้อใดข้อหนึ่งข้างต้นนี้ คุณจะต้องปฏิบัติตามนโยบายเพื่อครอบครัวของ Google Play (https://support.google.com/googleplay/android-developer/answer/9893335) คุณต้องการแจ้งให้ผู้ใช้ทราบถึงความมุ่งมั่นนี้ในส่วนความปลอดภัยของข้อมูลในข้อมูลสินค้าใน Store หรือไม่
PSL_INDEPENDENTLY_VALIDATED,,,OPTIONAL,"แอปของคุณผ่านการตรวจสอบความปลอดภัยโดยองค์กรอิสระตามกรอบการประเมินความปลอดภัยของแอปพลิเคชันบนมือถือ (MASA) เรียบร้อยแล้วใช่ไหม ตอบ ""ใช่"" เฉพาะเมื่อการตรวจสอบอยู่ในสถานะดีเท่านั้น"
PSL_UPI_BADGE_OPT_IN,,,OPTIONAL,คุณต้องการแสดงป้ายนี้ในข้อมูลสินค้าใน Store ไหม
PSL_HAS_OUTSIDE_APP_ACCOUNTS,,,OPTIONAL,ผู้ใช้จะเข้าสู่แอปของคุณด้วยบัญชีที่สร้างนอกแอปได้ไหม
PSL_OUTSIDE_APP_ACCOUNT_TYPES,PSL_LOGIN_WITH_OUTSIDE_APP_ID,,MULTIPLE_CHOICE,บัญชีเหล่านี้สร้างขึ้นอย่างไร / การระบุตัวตนนอกแอป (เช่น การผูกซิม การสมัครใช้บริการ)
PSL_OUTSIDE_APP_ACCOUNT_TYPES,PSL_LOGIN_THROUGH_EMPLOYMENT_OR_ENTERPRISE_ACCOUNT,,MULTIPLE_CHOICE,บัญชีเหล่านี้สร้างขึ้นอย่างไร / ผ่านการจ้างงานหรือบัญชีองค์กร
PSL_OUTSIDE_APP_ACCOUNT_TYPES,PSL_OUTSIDE_APP_ACCOUNT_TYPE_OTHER,,MULTIPLE_CHOICE,บัญชีเหล่านี้สร้างขึ้นอย่างไร / อื่นๆ
PSL_OUTSIDE_APP_ACCOUNT_TYPE_SPECIFY,,,MAYBE_REQUIRED,อธิบายวิธีสร้างบัญชีเหล่านี้
PSL_DATA_TYPES_PERSONAL,PSL_NAME,,MULTIPLE_CHOICE,ข้อมูลส่วนบุคคล / ชื่อ
PSL_DATA_TYPES_PERSONAL,PSL_EMAIL,,MULTIPLE_CHOICE,ข้อมูลส่วนบุคคล / ที่อยู่อีเมล
PSL_DATA_TYPES_PERSONAL,PSL_USER_ACCOUNT,,MULTIPLE_CHOICE,ข้อมูลส่วนบุคคล / รหัสผู้ใช้
PSL_DATA_TYPES_PERSONAL,PSL_ADDRESS,,MULTIPLE_CHOICE,ข้อมูลส่วนบุคคล / ที่อยู่
PSL_DATA_TYPES_PERSONAL,PSL_PHONE,,MULTIPLE_CHOICE,ข้อมูลส่วนบุคคล / หมายเลขโทรศัพท์
PSL_DATA_TYPES_PERSONAL,PSL_RACE_ETHNICITY,,MULTIPLE_CHOICE,ข้อมูลส่วนบุคคล / เชื้อชาติและชาติกำเนิด
PSL_DATA_TYPES_PERSONAL,PSL_POLITICAL_RELIGIOUS,,MULTIPLE_CHOICE,ข้อมูลส่วนบุคคล / ความเชื่อทางการเมืองหรือศาสนา
PSL_DATA_TYPES_PERSONAL,PSL_SEXUAL_ORIENTATION_GENDER_IDENTITY,,MULTIPLE_CHOICE,ข้อมูลส่วนบุคคล / วิถีทางเพศ
PSL_DATA_TYPES_PERSONAL,PSL_OTHER_PERSONAL,,MULTIPLE_CHOICE,ข้อมูลส่วนบุคคล / ข้อมูลอื่นๆ
PSL_DATA_TYPES_FINANCIAL,PSL_CREDIT_DEBIT_BANK_ACCOUNT_NUMBER,,MULTIPLE_CHOICE,ข้อมูลทางการเงิน / ข้อมูลการชำระเงินของผู้ใช้
PSL_DATA_TYPES_FINANCIAL,PSL_PURCHASE_HISTORY,,MULTIPLE_CHOICE,ข้อมูลทางการเงิน / ประวัติการซื้อ
PSL_DATA_TYPES_FINANCIAL,PSL_CREDIT_SCORE,,MULTIPLE_CHOICE,ข้อมูลทางการเงิน / คะแนนเครดิต
PSL_DATA_TYPES_FINANCIAL,PSL_OTHER,,MULTIPLE_CHOICE,ข้อมูลทางการเงิน / ข้อมูลทางการเงินอื่นๆ
PSL_DATA_TYPES_LOCATION,PSL_APPROX_LOCATION,,MULTIPLE_CHOICE,ตำแหน่ง / ตำแหน่งโดยประมาณ
PSL_DATA_TYPES_LOCATION,PSL_PRECISE_LOCATION,,MULTIPLE_CHOICE,ตำแหน่ง / ตำแหน่งที่แน่นอน
PSL_DATA_TYPES_SEARCH_AND_BROWSING,PSL_WEB_BROWSING_HISTORY,,MULTIPLE_CHOICE,การท่องเว็บ / ประวัติการท่องเว็บ
PSL_DATA_TYPES_EMAIL_AND_TEXT,PSL_EMAILS,,MULTIPLE_CHOICE,ข้อความ / อีเมล
PSL_DATA_TYPES_EMAIL_AND_TEXT,PSL_SMS_CALL_LOG,,MULTIPLE_CHOICE,ข้อความ / SMS หรือ MMS
PSL_DATA_TYPES_EMAIL_AND_TEXT,PSL_OTHER_MESSAGES,,MULTIPLE_CHOICE,ข้อความ / การรับส่งข้อความในแอปอื่นๆ
PSL_DATA_TYPES_PHOTOS_AND_VIDEOS,PSL_PHOTOS,,MULTIPLE_CHOICE,รูปภาพและวิดีโอ / รูปภาพ
PSL_DATA_TYPES_PHOTOS_AND_VIDEOS,PSL_VIDEOS,,MULTIPLE_CHOICE,รูปภาพและวิดีโอ / วิดีโอ
PSL_DATA_TYPES_AUDIO,PSL_AUDIO,,MULTIPLE_CHOICE,ไฟล์เสียง / การบันทึกเสียง
PSL_DATA_TYPES_AUDIO,PSL_MUSIC,,MULTIPLE_CHOICE,ไฟล์เสียง / ไฟล์เพลง
PSL_DATA_TYPES_AUDIO,PSL_OTHER_AUDIO,,MULTIPLE_CHOICE,ไฟล์เสียง / ไฟล์เสียงอื่นๆ
PSL_DATA_TYPES_HEALTH_AND_FITNESS,PSL_HEALTH,,MULTIPLE_CHOICE,สุขภาพและการออกกำลังกาย / ข้อมูลสุขภาพ
PSL_DATA_TYPES_HEALTH_AND_FITNESS,PSL_FITNESS,,MULTIPLE_CHOICE,สุขภาพและการออกกำลังกาย / ข้อมูลการออกกำลังกาย
PSL_DATA_TYPES_CONTACTS,PSL_CONTACTS,,MULTIPLE_CHOICE,รายชื่อติดต่อ / รายชื่อติดต่อ
PSL_DATA_TYPES_CALENDAR,PSL_CALENDAR,,MULTIPLE_CHOICE,ปฏิทิน / กิจกรรมในปฏิทิน
PSL_DATA_TYPES_APP_PERFORMANCE,PSL_CRASH_LOGS,,MULTIPLE_CHOICE,ข้อมูลและประสิทธิภาพของแอป / บันทึกการขัดข้อง
PSL_DATA_TYPES_APP_PERFORMANCE,PSL_PERFORMANCE_DIAGNOSTICS,,MULTIPLE_CHOICE,ข้อมูลและประสิทธิภาพของแอป / การวินิจฉัย
PSL_DATA_TYPES_APP_PERFORMANCE,PSL_OTHER_PERFORMANCE,,MULTIPLE_CHOICE,ข้อมูลและประสิทธิภาพของแอป / ข้อมูลประสิทธิภาพอื่นๆ ของแอป
PSL_DATA_TYPES_FILES_AND_DOCS,PSL_FILES_AND_DOCS,,MULTIPLE_CHOICE,ไฟล์และเอกสาร / ไฟล์และเอกสาร
PSL_DATA_TYPES_APP_ACTIVITY,PSL_USER_INTERACTION,,MULTIPLE_CHOICE,กิจกรรมบนแอป / การโต้ตอบกับแอป
PSL_DATA_TYPES_APP_ACTIVITY,PSL_IN_APP_SEARCH_HISTORY,,MULTIPLE_CHOICE,กิจกรรมบนแอป / ประวัติการค้นหาในแอป
PSL_DATA_TYPES_APP_ACTIVITY,PSL_APPS_ON_DEVICE,,MULTIPLE_CHOICE,กิจกรรมบนแอป / แอปที่ติดตั้ง
PSL_DATA_TYPES_APP_ACTIVITY,PSL_USER_GENERATED_CONTENT,,MULTIPLE_CHOICE,กิจกรรมบนแอป / เนื้อหาอื่นๆ ที่ผู้ใช้สร้างขึ้น
PSL_DATA_TYPES_APP_ACTIVITY,PSL_OTHER_APP_ACTIVITY,,MULTIPLE_CHOICE,กิจกรรมบนแอป / การดำเนินการอื่นๆ
PSL_DATA_TYPES_IDENTIFIERS,PSL_DEVICE_ID,,MULTIPLE_CHOICE,รหัสอุปกรณ์หรือรหัสอื่นๆ / รหัสอุปกรณ์หรือรหัสอื่นๆ
PSL_DATA_USAGE_RESPONSES:PSL_NAME:PSL_DATA_USAGE_COLLECTION_AND_SHARING,PSL_DATA_USAGE_ONLY_COLLECTED,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ข้อมูลนี้มีการรวบรวม แชร์ หรือทั้งสองอย่าง / รวบรวมแล้ว
PSL_DATA_USAGE_RESPONSES:PSL_NAME:PSL_DATA_USAGE_COLLECTION_AND_SHARING,PSL_DATA_USAGE_ONLY_SHARED,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ข้อมูลนี้มีการรวบรวม แชร์ หรือทั้งสองอย่าง / แชร์แล้ว
PSL_DATA_USAGE_RESPONSES:PSL_NAME:PSL_DATA_USAGE_EPHEMERAL,,,MAYBE_REQUIRED,การใช้และการจัดการข้อมูล (ชื่อ) / ข้อมูลนี้มีการประมวลผลชั่วคราวหรือไม่
PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_USER_CONTROL,PSL_DATA_USAGE_USER_CONTROL_OPTIONAL,,SINGLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ข้อมูลนี้จำเป็นสำหรับแอปคุณหรือไม่ หรือผู้ใช้สามารถเลือกว่าจะให้รวบรวมได้หรือไม่ / ผู้ใช้สามารถเลือกได้ว่าจะให้รวบรวมข้อมูลนี้หรือไม่
PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_USER_CONTROL,PSL_DATA_USAGE_USER_CONTROL_REQUIRED,,SINGLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ข้อมูลนี้จำเป็นสำหรับแอปคุณหรือไม่ หรือผู้ใช้สามารถเลือกว่าจะให้รวบรวมได้หรือไม่ / จำเป็นต้องมีการรวบรวมข้อมูล (ผู้ใช้ไม่สามารถปิดการรวบรวมข้อมูลนี้ได้)
PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE,PSL_APP_FUNCTIONALITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / ฟังก์ชันการทำงานของแอป
PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE,PSL_ANALYTICS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การวิเคราะห์
PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE,PSL_DEVELOPER_COMMUNICATIONS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การสื่อสารจากนักพัฒนาแอป
PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE,PSL_FRAUD_PREVENTION_SECURITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การป้องกันการประพฤติมิชอบ การรักษาความปลอดภัย และการปฏิบัติตามข้อกำหนด
PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE,PSL_ADVERTISING,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การโฆษณาหรือการตลาด
PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE,PSL_PERSONALIZATION,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การปรับแต่งสไตล์โทรศัพท์
PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE,PSL_ACCOUNT_MANAGEMENT,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การจัดการบัญชี
PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_SHARING_PURPOSE,PSL_APP_FUNCTIONALITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / ฟังก์ชันการทำงานของแอป
PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_SHARING_PURPOSE,PSL_ANALYTICS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การวิเคราะห์
PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_SHARING_PURPOSE,PSL_DEVELOPER_COMMUNICATIONS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การสื่อสารจากนักพัฒนาแอป
PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_SHARING_PURPOSE,PSL_FRAUD_PREVENTION_SECURITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การป้องกันการประพฤติมิชอบ การรักษาความปลอดภัย และการปฏิบัติตามข้อกำหนด
PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_SHARING_PURPOSE,PSL_ADVERTISING,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การโฆษณาหรือการตลาด
PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_SHARING_PURPOSE,PSL_PERSONALIZATION,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การปรับแต่งสไตล์โทรศัพท์
PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_SHARING_PURPOSE,PSL_ACCOUNT_MANAGEMENT,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ชื่อ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การจัดการบัญชี
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:PSL_DATA_USAGE_COLLECTION_AND_SHARING,PSL_DATA_USAGE_ONLY_COLLECTED,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ข้อมูลนี้มีการรวบรวม แชร์ หรือทั้งสองอย่าง / รวบรวมแล้ว
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:PSL_DATA_USAGE_COLLECTION_AND_SHARING,PSL_DATA_USAGE_ONLY_SHARED,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ข้อมูลนี้มีการรวบรวม แชร์ หรือทั้งสองอย่าง / แชร์แล้ว
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:PSL_DATA_USAGE_EPHEMERAL,,,MAYBE_REQUIRED,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ข้อมูลนี้มีการประมวลผลชั่วคราวหรือไม่
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_USER_CONTROL,PSL_DATA_USAGE_USER_CONTROL_OPTIONAL,,SINGLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ข้อมูลนี้จำเป็นสำหรับแอปคุณหรือไม่ หรือผู้ใช้สามารถเลือกว่าจะให้รวบรวมได้หรือไม่ / ผู้ใช้สามารถเลือกได้ว่าจะให้รวบรวมข้อมูลนี้หรือไม่
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_USER_CONTROL,PSL_DATA_USAGE_USER_CONTROL_REQUIRED,,SINGLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ข้อมูลนี้จำเป็นสำหรับแอปคุณหรือไม่ หรือผู้ใช้สามารถเลือกว่าจะให้รวบรวมได้หรือไม่ / จำเป็นต้องมีการรวบรวมข้อมูล (ผู้ใช้ไม่สามารถปิดการรวบรวมข้อมูลนี้ได้)
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE,PSL_APP_FUNCTIONALITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / ฟังก์ชันการทำงานของแอป
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE,PSL_ANALYTICS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การวิเคราะห์
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE,PSL_DEVELOPER_COMMUNICATIONS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การสื่อสารจากนักพัฒนาแอป
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE,PSL_FRAUD_PREVENTION_SECURITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การป้องกันการประพฤติมิชอบ การรักษาความปลอดภัย และการปฏิบัติตามข้อกำหนด
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE,PSL_ADVERTISING,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การโฆษณาหรือการตลาด
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE,PSL_PERSONALIZATION,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การปรับแต่งสไตล์โทรศัพท์
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE,PSL_ACCOUNT_MANAGEMENT,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การจัดการบัญชี
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_SHARING_PURPOSE,PSL_APP_FUNCTIONALITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / ฟังก์ชันการทำงานของแอป
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_SHARING_PURPOSE,PSL_ANALYTICS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การวิเคราะห์
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_SHARING_PURPOSE,PSL_DEVELOPER_COMMUNICATIONS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การสื่อสารจากนักพัฒนาแอป
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_SHARING_PURPOSE,PSL_FRAUD_PREVENTION_SECURITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การป้องกันการประพฤติมิชอบ การรักษาความปลอดภัย และการปฏิบัติตามข้อกำหนด
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_SHARING_PURPOSE,PSL_ADVERTISING,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การโฆษณาหรือการตลาด
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_SHARING_PURPOSE,PSL_PERSONALIZATION,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การปรับแต่งสไตล์โทรศัพท์
PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_SHARING_PURPOSE,PSL_ACCOUNT_MANAGEMENT,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ที่อยู่อีเมล) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การจัดการบัญชี
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:PSL_DATA_USAGE_COLLECTION_AND_SHARING,PSL_DATA_USAGE_ONLY_COLLECTED,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ข้อมูลนี้มีการรวบรวม แชร์ หรือทั้งสองอย่าง / รวบรวมแล้ว
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:PSL_DATA_USAGE_COLLECTION_AND_SHARING,PSL_DATA_USAGE_ONLY_SHARED,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ข้อมูลนี้มีการรวบรวม แชร์ หรือทั้งสองอย่าง / แชร์แล้ว
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:PSL_DATA_USAGE_EPHEMERAL,,,MAYBE_REQUIRED,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ข้อมูลนี้มีการประมวลผลชั่วคราวหรือไม่
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_USER_CONTROL,PSL_DATA_USAGE_USER_CONTROL_OPTIONAL,,SINGLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ข้อมูลนี้จำเป็นสำหรับแอปคุณหรือไม่ หรือผู้ใช้สามารถเลือกว่าจะให้รวบรวมได้หรือไม่ / ผู้ใช้สามารถเลือกได้ว่าจะให้รวบรวมข้อมูลนี้หรือไม่
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_USER_CONTROL,PSL_DATA_USAGE_USER_CONTROL_REQUIRED,,SINGLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ข้อมูลนี้จำเป็นสำหรับแอปคุณหรือไม่ หรือผู้ใช้สามารถเลือกว่าจะให้รวบรวมได้หรือไม่ / จำเป็นต้องมีการรวบรวมข้อมูล (ผู้ใช้ไม่สามารถปิดการรวบรวมข้อมูลนี้ได้)
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE,PSL_APP_FUNCTIONALITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / ฟังก์ชันการทำงานของแอป
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE,PSL_ANALYTICS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การวิเคราะห์
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE,PSL_DEVELOPER_COMMUNICATIONS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การสื่อสารจากนักพัฒนาแอป
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE,PSL_FRAUD_PREVENTION_SECURITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การป้องกันการประพฤติมิชอบ การรักษาความปลอดภัย และการปฏิบัติตามข้อกำหนด
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE,PSL_ADVERTISING,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การโฆษณาหรือการตลาด
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE,PSL_PERSONALIZATION,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การปรับแต่งสไตล์โทรศัพท์
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE,PSL_ACCOUNT_MANAGEMENT,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การจัดการบัญชี
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_SHARING_PURPOSE,PSL_APP_FUNCTIONALITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / ฟังก์ชันการทำงานของแอป
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_SHARING_PURPOSE,PSL_ANALYTICS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การวิเคราะห์
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_SHARING_PURPOSE,PSL_DEVELOPER_COMMUNICATIONS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การสื่อสารจากนักพัฒนาแอป
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_SHARING_PURPOSE,PSL_FRAUD_PREVENTION_SECURITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การป้องกันการประพฤติมิชอบ การรักษาความปลอดภัย และการปฏิบัติตามข้อกำหนด
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_SHARING_PURPOSE,PSL_ADVERTISING,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การโฆษณาหรือการตลาด
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_SHARING_PURPOSE,PSL_PERSONALIZATION,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การปรับแต่งสไตล์โทรศัพท์
PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_SHARING_PURPOSE,PSL_ACCOUNT_MANAGEMENT,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รหัสผู้ใช้) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การจัดการบัญชี
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:PSL_DATA_USAGE_COLLECTION_AND_SHARING,PSL_DATA_USAGE_ONLY_COLLECTED,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ข้อมูลนี้มีการรวบรวม แชร์ หรือทั้งสองอย่าง / รวบรวมแล้ว
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:PSL_DATA_USAGE_COLLECTION_AND_SHARING,PSL_DATA_USAGE_ONLY_SHARED,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ข้อมูลนี้มีการรวบรวม แชร์ หรือทั้งสองอย่าง / แชร์แล้ว
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:PSL_DATA_USAGE_EPHEMERAL,,,MAYBE_REQUIRED,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ข้อมูลนี้มีการประมวลผลชั่วคราวหรือไม่
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_USER_CONTROL,PSL_DATA_USAGE_USER_CONTROL_OPTIONAL,,SINGLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ข้อมูลนี้จำเป็นสำหรับแอปคุณหรือไม่ หรือผู้ใช้สามารถเลือกว่าจะให้รวบรวมได้หรือไม่ / ผู้ใช้สามารถเลือกได้ว่าจะให้รวบรวมข้อมูลนี้หรือไม่
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_USER_CONTROL,PSL_DATA_USAGE_USER_CONTROL_REQUIRED,,SINGLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ข้อมูลนี้จำเป็นสำหรับแอปคุณหรือไม่ หรือผู้ใช้สามารถเลือกว่าจะให้รวบรวมได้หรือไม่ / จำเป็นต้องมีการรวบรวมข้อมูล (ผู้ใช้ไม่สามารถปิดการรวบรวมข้อมูลนี้ได้)
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE,PSL_APP_FUNCTIONALITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / ฟังก์ชันการทำงานของแอป
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE,PSL_ANALYTICS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การวิเคราะห์
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE,PSL_DEVELOPER_COMMUNICATIONS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การสื่อสารจากนักพัฒนาแอป
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE,PSL_FRAUD_PREVENTION_SECURITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การป้องกันการประพฤติมิชอบ การรักษาความปลอดภัย และการปฏิบัติตามข้อกำหนด
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE,PSL_ADVERTISING,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การโฆษณาหรือการตลาด
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE,PSL_PERSONALIZATION,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การปรับแต่งสไตล์โทรศัพท์
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE,PSL_ACCOUNT_MANAGEMENT,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การจัดการบัญชี
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_SHARING_PURPOSE,PSL_APP_FUNCTIONALITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / ฟังก์ชันการทำงานของแอป
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_SHARING_PURPOSE,PSL_ANALYTICS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การวิเคราะห์
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_SHARING_PURPOSE,PSL_DEVELOPER_COMMUNICATIONS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การสื่อสารจากนักพัฒนาแอป
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_SHARING_PURPOSE,PSL_FRAUD_PREVENTION_SECURITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การป้องกันการประพฤติมิชอบ การรักษาความปลอดภัย และการปฏิบัติตามข้อกำหนด
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_SHARING_PURPOSE,PSL_ADVERTISING,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การโฆษณาหรือการตลาด
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_SHARING_PURPOSE,PSL_PERSONALIZATION,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การปรับแต่งสไตล์โทรศัพท์
PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_SHARING_PURPOSE,PSL_ACCOUNT_MANAGEMENT,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งโดยประมาณ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การจัดการบัญชี
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:PSL_DATA_USAGE_COLLECTION_AND_SHARING,PSL_DATA_USAGE_ONLY_COLLECTED,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ข้อมูลนี้มีการรวบรวม แชร์ หรือทั้งสองอย่าง / รวบรวมแล้ว
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:PSL_DATA_USAGE_COLLECTION_AND_SHARING,PSL_DATA_USAGE_ONLY_SHARED,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ข้อมูลนี้มีการรวบรวม แชร์ หรือทั้งสองอย่าง / แชร์แล้ว
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:PSL_DATA_USAGE_EPHEMERAL,,,MAYBE_REQUIRED,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ข้อมูลนี้มีการประมวลผลชั่วคราวหรือไม่
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_USER_CONTROL,PSL_DATA_USAGE_USER_CONTROL_OPTIONAL,,SINGLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ข้อมูลนี้จำเป็นสำหรับแอปคุณหรือไม่ หรือผู้ใช้สามารถเลือกว่าจะให้รวบรวมได้หรือไม่ / ผู้ใช้สามารถเลือกได้ว่าจะให้รวบรวมข้อมูลนี้หรือไม่
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_USER_CONTROL,PSL_DATA_USAGE_USER_CONTROL_REQUIRED,,SINGLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ข้อมูลนี้จำเป็นสำหรับแอปคุณหรือไม่ หรือผู้ใช้สามารถเลือกว่าจะให้รวบรวมได้หรือไม่ / จำเป็นต้องมีการรวบรวมข้อมูล (ผู้ใช้ไม่สามารถปิดการรวบรวมข้อมูลนี้ได้)
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_COLLECTION_PURPOSE,PSL_APP_FUNCTIONALITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / ฟังก์ชันการทำงานของแอป
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_COLLECTION_PURPOSE,PSL_ANALYTICS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การวิเคราะห์
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_COLLECTION_PURPOSE,PSL_DEVELOPER_COMMUNICATIONS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การสื่อสารจากนักพัฒนาแอป
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_COLLECTION_PURPOSE,PSL_FRAUD_PREVENTION_SECURITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การป้องกันการประพฤติมิชอบ การรักษาความปลอดภัย และการปฏิบัติตามข้อกำหนด
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_COLLECTION_PURPOSE,PSL_ADVERTISING,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การโฆษณาหรือการตลาด
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_COLLECTION_PURPOSE,PSL_PERSONALIZATION,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การปรับแต่งสไตล์โทรศัพท์
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_COLLECTION_PURPOSE,PSL_ACCOUNT_MANAGEMENT,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การจัดการบัญชี
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_SHARING_PURPOSE,PSL_APP_FUNCTIONALITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / ฟังก์ชันการทำงานของแอป
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_SHARING_PURPOSE,PSL_ANALYTICS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การวิเคราะห์
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_SHARING_PURPOSE,PSL_DEVELOPER_COMMUNICATIONS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การสื่อสารจากนักพัฒนาแอป
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_SHARING_PURPOSE,PSL_FRAUD_PREVENTION_SECURITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การป้องกันการประพฤติมิชอบ การรักษาความปลอดภัย และการปฏิบัติตามข้อกำหนด
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_SHARING_PURPOSE,PSL_ADVERTISING,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การโฆษณาหรือการตลาด
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_SHARING_PURPOSE,PSL_PERSONALIZATION,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การปรับแต่งสไตล์โทรศัพท์
PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_SHARING_PURPOSE,PSL_ACCOUNT_MANAGEMENT,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (ตำแหน่งที่แน่นอน) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การจัดการบัญชี
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:PSL_DATA_USAGE_COLLECTION_AND_SHARING,PSL_DATA_USAGE_ONLY_COLLECTED,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ข้อมูลนี้มีการรวบรวม แชร์ หรือทั้งสองอย่าง / รวบรวมแล้ว
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:PSL_DATA_USAGE_COLLECTION_AND_SHARING,PSL_DATA_USAGE_ONLY_SHARED,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ข้อมูลนี้มีการรวบรวม แชร์ หรือทั้งสองอย่าง / แชร์แล้ว
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:PSL_DATA_USAGE_EPHEMERAL,,,MAYBE_REQUIRED,การใช้และการจัดการข้อมูล (รูปภาพ) / ข้อมูลนี้มีการประมวลผลชั่วคราวหรือไม่
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_USER_CONTROL,PSL_DATA_USAGE_USER_CONTROL_OPTIONAL,,SINGLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ข้อมูลนี้จำเป็นสำหรับแอปคุณหรือไม่ หรือผู้ใช้สามารถเลือกว่าจะให้รวบรวมได้หรือไม่ / ผู้ใช้สามารถเลือกได้ว่าจะให้รวบรวมข้อมูลนี้หรือไม่
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_USER_CONTROL,PSL_DATA_USAGE_USER_CONTROL_REQUIRED,,SINGLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ข้อมูลนี้จำเป็นสำหรับแอปคุณหรือไม่ หรือผู้ใช้สามารถเลือกว่าจะให้รวบรวมได้หรือไม่ / จำเป็นต้องมีการรวบรวมข้อมูล (ผู้ใช้ไม่สามารถปิดการรวบรวมข้อมูลนี้ได้)
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_COLLECTION_PURPOSE,PSL_APP_FUNCTIONALITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / ฟังก์ชันการทำงานของแอป
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_COLLECTION_PURPOSE,PSL_ANALYTICS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การวิเคราะห์
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_COLLECTION_PURPOSE,PSL_DEVELOPER_COMMUNICATIONS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การสื่อสารจากนักพัฒนาแอป
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_COLLECTION_PURPOSE,PSL_FRAUD_PREVENTION_SECURITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การป้องกันการประพฤติมิชอบ การรักษาความปลอดภัย และการปฏิบัติตามข้อกำหนด
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_COLLECTION_PURPOSE,PSL_ADVERTISING,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การโฆษณาหรือการตลาด
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_COLLECTION_PURPOSE,PSL_PERSONALIZATION,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การปรับแต่งสไตล์โทรศัพท์
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_COLLECTION_PURPOSE,PSL_ACCOUNT_MANAGEMENT,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ทำไมจึงรวบรวมข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การจัดการบัญชี
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_SHARING_PURPOSE,PSL_APP_FUNCTIONALITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / ฟังก์ชันการทำงานของแอป
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_SHARING_PURPOSE,PSL_ANALYTICS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การวิเคราะห์
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_SHARING_PURPOSE,PSL_DEVELOPER_COMMUNICATIONS,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การสื่อสารจากนักพัฒนาแอป
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_SHARING_PURPOSE,PSL_FRAUD_PREVENTION_SECURITY,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การป้องกันการประพฤติมิชอบ การรักษาความปลอดภัย และการปฏิบัติตามข้อกำหนด
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_SHARING_PURPOSE,PSL_ADVERTISING,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การโฆษณาหรือการตลาด
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_SHARING_PURPOSE,PSL_PERSONALIZATION,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การปรับแต่งสไตล์โทรศัพท์
PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_SHARING_PURPOSE,PSL_ACCOUNT_MANAGEMENT,,MULTIPLE_CHOICE,การใช้และการจัดการข้อมูล (รูปภาพ) / ทำไมจึงแชร์ข้อมูลผู้ใช้นี้ เลือกได้มากกว่า 1 ข้อ / การจัดการบัญชี
"""

reader = csv.reader(io.StringIO(raw_csv.strip()))
rows = list(reader)
header = rows[0]

# Mapping rules for responses
filled_rows = [header]

# Data types that are collected:
# PSL_NAME, PSL_EMAIL, PSL_USER_ACCOUNT, PSL_APPROX_LOCATION, PSL_PRECISE_LOCATION, PSL_PHOTOS

for row in rows[1:]:
    q_id, r_id, val, req, label = row
    
    # 1. Selection of Data Types
    if q_id == "PSL_DATA_TYPES_PERSONAL" and r_id in ("PSL_NAME", "PSL_EMAIL", "PSL_USER_ACCOUNT"):
        val = "true"
    elif q_id == "PSL_DATA_TYPES_LOCATION" and r_id in ("PSL_APPROX_LOCATION", "PSL_PRECISE_LOCATION"):
        val = "true"
    elif q_id == "PSL_DATA_TYPES_PHOTOS_AND_VIDEOS" and r_id == "PSL_PHOTOS":
        val = "true"
        
    # 2. Detailed Data Usage for collected items
    # PSL_NAME
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_NAME:PSL_DATA_USAGE_COLLECTION_AND_SHARING" and r_id == "PSL_DATA_USAGE_ONLY_COLLECTED":
        val = "true"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_NAME:PSL_DATA_USAGE_EPHEMERAL":
        val = "false"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_USER_CONTROL" and r_id == "PSL_DATA_USAGE_USER_CONTROL_REQUIRED":
        val = "true"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE" and r_id in ("PSL_APP_FUNCTIONALITY", "PSL_ACCOUNT_MANAGEMENT"):
        val = "true"

    # PSL_EMAIL
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:PSL_DATA_USAGE_COLLECTION_AND_SHARING" and r_id == "PSL_DATA_USAGE_ONLY_COLLECTED":
        val = "true"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:PSL_DATA_USAGE_EPHEMERAL":
        val = "false"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_USER_CONTROL" and r_id == "PSL_DATA_USAGE_USER_CONTROL_REQUIRED":
        val = "true"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE" and r_id in ("PSL_APP_FUNCTIONALITY", "PSL_ACCOUNT_MANAGEMENT"):
        val = "true"

    # PSL_USER_ACCOUNT
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:PSL_DATA_USAGE_COLLECTION_AND_SHARING" and r_id == "PSL_DATA_USAGE_ONLY_COLLECTED":
        val = "true"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:PSL_DATA_USAGE_EPHEMERAL":
        val = "false"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_USER_CONTROL" and r_id == "PSL_DATA_USAGE_USER_CONTROL_REQUIRED":
        val = "true"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE" and r_id in ("PSL_APP_FUNCTIONALITY", "PSL_ACCOUNT_MANAGEMENT"):
        val = "true"

    # PSL_APPROX_LOCATION
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:PSL_DATA_USAGE_COLLECTION_AND_SHARING" and r_id == "PSL_DATA_USAGE_ONLY_COLLECTED":
        val = "true"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:PSL_DATA_USAGE_EPHEMERAL":
        val = "false"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_USER_CONTROL" and r_id == "PSL_DATA_USAGE_USER_CONTROL_OPTIONAL":
        val = "true"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE" and r_id == "PSL_APP_FUNCTIONALITY":
        val = "true"

    # PSL_PRECISE_LOCATION
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:PSL_DATA_USAGE_COLLECTION_AND_SHARING" and r_id == "PSL_DATA_USAGE_ONLY_COLLECTED":
        val = "true"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:PSL_DATA_USAGE_EPHEMERAL":
        val = "false"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_USER_CONTROL" and r_id == "PSL_DATA_USAGE_USER_CONTROL_OPTIONAL":
        val = "true"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_PRECISE_LOCATION:DATA_USAGE_COLLECTION_PURPOSE" and r_id == "PSL_APP_FUNCTIONALITY":
        val = "true"

    # PSL_PHOTOS
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:PSL_DATA_USAGE_COLLECTION_AND_SHARING" and r_id == "PSL_DATA_USAGE_ONLY_COLLECTED":
        val = "true"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:PSL_DATA_USAGE_EPHEMERAL":
        val = "false"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_USER_CONTROL" and r_id == "PSL_DATA_USAGE_USER_CONTROL_REQUIRED":
        val = "true"
    elif q_id == "PSL_DATA_USAGE_RESPONSES:PSL_PHOTOS:DATA_USAGE_COLLECTION_PURPOSE" and r_id == "PSL_APP_FUNCTIONALITY":
        val = "true"

    filled_rows.append([q_id, r_id, val, req, label])

out_path = "docs/google_play_data_safety_filled.csv"
with open(out_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerows(filled_rows)

print(f"Successfully generated {out_path} with {len(filled_rows)} rows.")
