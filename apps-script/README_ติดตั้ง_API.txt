ROSE Café — Apps Script Backend API

ไฟล์นี้ใช้แทน Code.gs เดิม หลังจากย้ายหน้าเว็บไป GitHub Pages

วิธีติดตั้ง
1. เปิดโปรเจกต์ Google Apps Script ของ ROSE Café
2. เปิด Code.gs แล้วกด Ctrl+A
3. วางโค้ดจากไฟล์ Code.gs ชุดนี้แทนทั้งหมด แล้วกด Save
4. ไม่ต้องใช้ Index.html, Style.html หรือ Script.html สำหรับหน้าเว็บอีกต่อไป
5. เปิด Project Settings > Script Properties
6. เพิ่ม Script Properties จำนวน 3 ค่า
   - SPREADSHEET_ID = รหัสจาก URL ของ Google Sheet หลัง /d/ และก่อน /edit
   - PAYMENT_FOLDER_ID = รหัสจาก URL โฟลเดอร์ Google Drive สำหรับเก็บสลิป
   - ADMIN_PASSWORD = รหัสผ่านใหม่ที่คาดเดายาก (ไม่ควรใช้ 1234)
7. เลือกฟังก์ชัน preDeployCheck แล้วกด Run
8. ไปที่ Deploy > Manage deployments > Edit
9. เลือก Version: New version
10. ตั้ง Execute as: Me และ Who has access: Anyone
11. กด Deploy

สำคัญ
- ใช้ Deployment เดิม เพื่อให้ URL API เดิมไม่เปลี่ยน
- ระบบจะไม่เก็บ Spreadsheet ID, Folder ID หรือรหัส Admin ไว้ใน GitHub
- ไฟล์สลิปจะเป็นไฟล์ส่วนตัวใน Google Drive ไม่เปิด Anyone with link อัตโนมัติ
- หน้า GitHub ถูกตั้งค่าให้เรียก URL นี้แล้ว:
  https://script.google.com/macros/s/AKfycbx_PqubX4z-wcJ-OcNfARcDkCCLxvDdxrFbairEpoaYJRJL1KQfYhcg5pkGwMsKqHVCvw/exec
- หลัง Deploy ทดสอบโดยเปิด:
  https://script.google.com/macros/s/AKfycbx_PqubX4z-wcJ-OcNfARcDkCCLxvDdxrFbairEpoaYJRJL1KQfYhcg5pkGwMsKqHVCvw/exec?action=health
- หากเห็น JSON ที่มี success:true แสดงว่า API พร้อมใช้งาน

ลิงก์หน้าเว็บหลังระบบพร้อม
- ลูกค้า: https://madamroses15-code.github.io/rose-cafe/
- Admin: https://madamroses15-code.github.io/rose-cafe/admin.html
