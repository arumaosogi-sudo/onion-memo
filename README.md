# Onion Memo

เว็บจริง: https://arumaosogi-sudo.github.io/tacker-app/ (GitHub Pages, deploy อัตโนมัติทุกครั้งที่ push เข้า main)

เว็บแอปจดและติดตามงานภาษาไทย ตามดีไซน์ใน Figma (Itim + Prompt, โทนพาสเทลลาเวนเดอร์, รองรับโหมดมืดอัตโนมัติ)

## รัน

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # ทดสอบตัวแยกภาษาไทย + การคำนวณวันเหลือ
npm run build    # ได้ไฟล์ static ใน dist/ (GitHub Actions build + deploy ขึ้น Pages ให้เอง)
```

## AI ช่วยแยก (Gemini)

- กด **ตั้งค่า AI** ในแถบเมนู แล้ววาง Gemini API key จาก https://aistudio.google.com/apikey
- key เก็บใน localStorage ของเบราว์เซอร์เครื่องนั้นเท่านั้น ไม่อยู่ในโค้ด/repo/เว็บ เบราว์เซอร์เรียก Gemini โดยตรง (`src/lib/gemini.ts`)
- prompt ภาษาไทยพร้อมตัวอย่าง + JSON schema แยก หัวข้อ / รายละเอียด / วันส่ง (ไม่เดาวัน) โมเดล `gemini-3.5-flash-lite` (สำรอง `gemini-3.5-flash`)
- ไม่มี key, key ผิด, ออฟไลน์ หรือ AI ล่ม → ใช้ตัวแยกในเครื่องแทน พร้อม Toast บอกเหตุผล

## ทำอะไรได้

- พิมพ์งานเป็นประโยค → **ให้ AI ช่วยแยก** → Review Board ให้ตรวจ/แก้ หัวข้อ รายละเอียด วันส่ง ก่อนบันทึก
- ตัวแยกสำรองทำงานในเครื่อง (ไม่ต้องใช้ key): วันนี้, พรุ่งนี้, มะรืน, อีก N วัน, วันจันทร์(หน้า/นี้), สัปดาห์หน้า, 23 พ.ย. 2569, 23/11/69
  วันที่กำกวมเสนอทางเลือก, แปลงไม่ได้จะขึ้น "ยังไม่ระบุวัน" (ไม่เดาเงียบ)
- สถานะ 6 ระดับ (ข้อความ + ไอคอน + สี) คำนวณจากวันที่ของเครื่อง ตัดที่เที่ยงคืนเวลาท้องถิ่น
- ปฏิทินสัปดาห์/เดือน จุดต่างรูปทรงตามระดับ แตะวันเพื่อกรอง, AlertStrip แตะเพื่อกรองงานด่วน
- เสร็จงาน → Toast "เลิกทำ" 9 วินาที → Memory Box เก็บ 30 วันแล้วลบอัตโนมัติ, กู้คืนได้
- ข้อมูลเก็บใน localStorage ของเบราว์เซอร์เครื่องนั้นๆ (เริ่มต้นว่าง ไม่มีข้อมูลตัวอย่าง)

## โครงสร้าง

- `src/lib/date.ts` วันที่ไทย/พ.ศ. และระดับความเร่งด่วน
- `src/lib/parse.ts` ตัวแยกข้อความภาษาไทย (+ `parse.test.ts`)
- `src/lib/store.ts` เก็บงานใน localStorage (ซิงก์ข้ามแท็บ), ล้าง Memory Box อายุเกิน 30 วัน
- `src/components/` NavBar อยู่ใน `App.tsx`, Calendar, TaskForm (Review/Edit), Home (AlertStrip, Composer, TaskCard), Extras (Toast, MemoryBox, ConfirmModal, EmptyState)

## ต่อยอด

- ถ้าอยากให้ทุกคนที่เปิดเว็บใช้ AI ได้โดยไม่ต้องใส่ key: ต้องมี backend เล็กๆ (เช่น Cloudflare Worker) ถือ key แทน
- ซิงก์หลายเครื่อง: ย้าย `store.ts` ไปใช้ Supabase หรือ D1
