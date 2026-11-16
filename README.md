# Smart Task Tracker & Calendar

เว็บจริง: https://smart-task-tracker-blue.vercel.app (deploy อัตโนมัติทุกครั้งที่ push เข้า main)

เว็บแอปจดและติดตามงานภาษาไทย ตามดีไซน์ใน Figma (Itim + Prompt, โทนพาสเทลลาเวนเดอร์, รองรับโหมดมืดอัตโนมัติ)

## รัน

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # ทดสอบตัวแยกภาษาไทย + การคำนวณวันเหลือ
npm run build    # ได้ไฟล์ static ใน dist/ (deploy ที่ Cloudflare Pages / Vercel ได้)
```

## ทำอะไรได้

- พิมพ์งานเป็นประโยค → **ให้ AI ช่วยแยก** → Review Board ให้ตรวจ/แก้ หัวข้อ รายละเอียด วันส่ง ก่อนบันทึก
- ตัวแยกทำงานในเครื่อง (ไม่ต้องใช้ API key): วันนี้, พรุ่งนี้, มะรืน, อีก N วัน, วันจันทร์(หน้า/นี้), สัปดาห์หน้า, 23 พ.ย. 2569, 23/11/69
  วันที่กำกวมเสนอทางเลือก, แปลงไม่ได้จะขึ้น "ยังไม่ระบุวัน" (ไม่เดาเงียบ)
- สถานะ 6 ระดับ (ข้อความ + ไอคอน + สี) คำนวณจากวันที่ของเครื่อง ตัดที่เที่ยงคืนเวลาท้องถิ่น
- ปฏิทินสัปดาห์/เดือน จุดต่างรูปทรงตามระดับ แตะวันเพื่อกรอง, AlertStrip แตะเพื่อกรองงานด่วน
- เสร็จงาน → Toast "เลิกทำ" 9 วินาที → Memory Box เก็บ 30 วันแล้วลบอัตโนมัติ, กู้คืนได้
- ข้อมูลเก็บใน localStorage ของเบราว์เซอร์ (ครั้งแรกมีข้อมูลตัวอย่าง)

## โครงสร้าง

- `src/lib/date.ts` วันที่ไทย/พ.ศ. และระดับความเร่งด่วน
- `src/lib/parse.ts` ตัวแยกข้อความภาษาไทย (+ `parse.test.ts`)
- `src/lib/store.ts` เก็บงานใน localStorage, ข้อมูลตัวอย่าง, ล้าง Memory Box อายุเกิน 30 วัน
- `src/components/` NavBar อยู่ใน `App.tsx`, Calendar, TaskForm (Review/Edit), Home (AlertStrip, Composer, TaskCard), Extras (Toast, MemoryBox, ConfirmModal, EmptyState)

## ต่อยอด

- เปลี่ยนตัวแยกเป็น Claude API: เพิ่ม backend เล็กๆ (เช่น Cloudflare Worker) ถือ API key แล้วให้ `parseTask` เรียกผ่าน endpoint นั้น โดยใช้ผลจากตัวแยกในเครื่องเป็น fallback
- ซิงก์หลายเครื่อง: ย้าย `store.ts` ไปใช้ Supabase หรือ D1
