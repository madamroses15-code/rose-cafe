# ROSE Café — GitHub Pages + Apps Script API

หน้าเว็บ ROSE Café ทำงานบน GitHub Pages โดยตรง จึงไม่มีแถบ “This application was created by a Google Apps Script user”

## เว็บไซต์

- ลูกค้า: https://madamroses15-code.github.io/rose-cafe/
- Admin: https://madamroses15-code.github.io/rose-cafe/admin.html

## โครงสร้างระบบ

- `index.html` — หน้าเมนู ตะกร้า และชำระเงินสำหรับลูกค้า
- `admin.html` — สถานะออเดอร์ จัดการเมนู และ Dashboard
- `styles.css` — Responsive UI สำหรับมือถือ iPad และ Desktop
- `api.js` — ตัวเชื่อม GitHub Pages กับ Apps Script API
- `app.js` — ระบบสั่งอาหารและชำระเงิน
- `admin.js` — ระบบผู้ดูแล
- `apps-script/Code.gs` — Backend API และการเชื่อม Google Sheets/Google Drive

## การทำงาน

GitHub Pages โหลดข้อมูลเมนูแบบ JSONP จาก Apps Script ส่วนคำสั่งที่เขียนข้อมูล เช่น สร้างออเดอร์ ชำระเงิน และอัปเดตสถานะ จะส่งแบบ POST แล้วตรวจผลด้วย request ID แบบสุ่ม

## การติดตั้ง Backend

ทำตามไฟล์ `apps-script/README_ติดตั้ง_API.txt` แล้วอัปเดต Deployment เดิมเป็น New version

## ทดสอบหน้าจอโดยไม่ใช้ข้อมูลจริง

เติม `?demo=1` ท้าย URL เช่น `index.html?demo=1` หรือ `admin.html?demo=1` (รหัส Demo: `1234`)

## GitHub Pages

Repository นี้เผยแพร่ด้วย GitHub Actions เมื่อมีการอัปเดตสาขา `main`
