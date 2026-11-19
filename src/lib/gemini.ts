// Gemini call made directly from the browser. The API key is entered by the user in
// "ตั้งค่า AI" and stored only in this browser's localStorage — it is never in the code,
// the repo, or the GitHub Pages bundle.

const WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
// Fast, current models first (checked against ListModels on 2026-11-19).
export const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];
const KEY_STORE = 'stt.geminiKey';
const MAX_CHARS = 600;

export function getGeminiKey(): string {
  try { return localStorage.getItem(KEY_STORE) ?? ''; } catch { return ''; }
}
export function setGeminiKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORE, key.trim());
    else localStorage.removeItem(KEY_STORE);
  } catch { /* storage blocked */ }
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
function validISO(s: unknown): string | null {
  if (typeof s !== 'string' || !ISO.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? s : null;
}

function systemPrompt(today: string): string {
  const [y, m, d] = today.split('-').map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `คุณคือผู้ช่วยแยกข้อความ "งานที่ต้องทำ" ภาษาไทยของนักเรียน/นักศึกษา ให้ตอบเป็น JSON ตาม schema เท่านั้น
วันนี้คือวัน${wd}ที่ ${today} (ปี ค.ศ.; ปี พ.ศ. = ค.ศ. + 543) สัปดาห์เริ่มวันอาทิตย์ เขตเวลา Asia/Bangkok

กติกา
1. title: ชื่องานสั้น กระชับ 3–60 ตัวอักษร ขึ้นต้นด้วยคำกริยาหรือชื่องาน เช่น "ส่งรายงานวิทย์", "ทำ Project Seminar" ห้ามใส่วันที่ในชื่อ คงคำภาษาอังกฤษ/ชื่อเฉพาะไว้ตามเดิม
2. detail: ใจความสำคัญที่เหลือ (ห้ามซ้ำกับ title และห้ามใส่ข้อความทั้งประโยคไว้ใน title) เช่น หน้าที่ที่รับผิดชอบ ทำกับใคร ขอบเขตงาน เขียนเป็นวลีสั้นๆ คั่นด้วย " · " ถ้าไม่มีให้เป็น "" ตัดคำฟุ่มเฟือย เช่น "ผมมี", "ครับ", "นะ" และแก้คำพิมพ์ผิดที่ชัดเจน (เช่น "กรแง" → "กรอง")
3. due: วันส่งรูปแบบ YYYY-MM-DD (ค.ศ.) หรือ null ถ้าข้อความไม่บอกวันเลย ห้ามเดา
   - "วันนี้"=วันนี้, "พรุ่งนี้"=+1, "มะรืน"=+2, "อีก N วัน"=+N
   - "30 เดือนนี้" = วันที่ 30 ของเดือนปัจจุบัน (ถ้าเดือนนั้นไม่มีวันที่ดังกล่าวให้ใช้วันสุดท้ายของเดือน)
   - "วันที่ 30" (ไม่ระบุเดือน) = วันที่ 30 ของเดือนปัจจุบัน ถ้าผ่านไปแล้วให้ใช้เดือนถัดไป
   - "30 เดือนหน้า" = วันที่ 30 ของเดือนถัดไป, "สิ้นเดือน" = วันสุดท้ายของเดือนนี้
   - ชื่อวันเฉยๆ หรือ "วัน…นี้" = วันนั้นที่ใกล้ที่สุดตั้งแต่วันนี้; "วัน…หน้า" = วันนั้นของสัปดาห์หน้า
   - ปี พ.ศ. (เช่น 2569 หรือ 69) ให้แปลงเป็น ค.ศ.
4. matched: คำในข้อความต้นฉบับที่ใช้อ่านวันที่ (คัดลอกตามจริง) หรือ null
5. alternative: ถ้าวันที่ตีความได้สองแบบ ให้ใส่อีกความหมายหนึ่ง (YYYY-MM-DD) ไม่เช่นนั้น null

ตัวอย่าง (สมมติวันนี้ 2026-11-16 วันจันทร์)
ข้อความ: "ผมมี project seminar ที่ทำกับเพื่อนและผมทำหน้าที่สร้างหน้าบ้านและหลังบ้าน พร้อมมีกำหนดส่ง 30เดือนนี้"
JSON: {"title":"ทำ Project Seminar","detail":"ทำกับเพื่อน · รับผิดชอบหน้าบ้าน (frontend) และหลังบ้าน (backend)","due":"2026-11-30","matched":"30เดือนนี้","alternative":null}
ข้อความ: "ผมมีงานทำ database สำหรับโครงการใหญ่ด้วยมีหน้าที่กรแงข้อมูล ส่งก่อนวันที่23เดือนนี้"
JSON: {"title":"ทำ Database","detail":"สำหรับโครงการใหญ่ · หน้าที่กรองข้อมูล","due":"2026-11-23","matched":"วันที่23เดือนนี้","alternative":null}
ข้อความ: "ส่งรายงานวิทย์ สรุปบทที่ 3-4 วันจันทร์หน้า"
JSON: {"title":"ส่งรายงานวิทย์","detail":"สรุปบทที่ 3-4","due":"2026-11-23","matched":"วันจันทร์หน้า","alternative":null}
ข้อความ: "อ่านหนังสือสอบ eng บทที่ 5-7 กับแนน"
JSON: {"title":"อ่านหนังสือสอบภาษาอังกฤษ","detail":"บทที่ 5-7 · อ่านกับแนน","due":null,"matched":null,"alternative":null}
ข้อความ: "พรุ่งนี้ต้องซื้อของขวัญวันเกิดให้มายด์ งบไม่เกิน 500"
JSON: {"title":"ซื้อของขวัญวันเกิดให้มายด์","detail":"งบไม่เกิน 500 บาท","due":"2026-11-17","matched":"พรุ่งนี้","alternative":null}`;
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    detail: { type: 'STRING' },
    due: { type: 'STRING', nullable: true },
    matched: { type: 'STRING', nullable: true },
    alternative: { type: 'STRING', nullable: true },
  },
  required: ['title', 'detail', 'due', 'matched', 'alternative'],
};

export interface GeminiParse { title: string; detail: string; due: string | null; matched: string | null; alternative: string | null; model: string }
export class GeminiError extends Error {
  constructor(public code: 'no_key' | 'bad_key' | 'rate_limited' | 'failed') { super(code); }
}

async function call(key: string, model: string, text: string, today: string, lowThinking: boolean): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt(today) }] },
        contents: [{ role: 'user', parts: [{ text: `ข้อความ: "${text}"` }] }],
        generationConfig: {
          temperature: 0.1, responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA,
          ...(lowThinking ? { thinkingConfig: { thinkingLevel: 'minimal' } } : {}),
        },
      }),
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function geminiParse(input: string, today: string, key = getGeminiKey()): Promise<GeminiParse> {
  if (!key) throw new GeminiError('no_key');
  const text = input.trim().slice(0, MAX_CHARS);
  let last: GeminiError['code'] = 'failed';
  for (const model of MODELS) {
    try {
      let r = await call(key, model, text, today, true);
      if (r.status === 400) {
        const body = await r.clone().text();
        if (/API[_ ]?key|API_KEY_INVALID/i.test(body)) throw new GeminiError('bad_key');
        r = await call(key, model, text, today, false); // model without thinkingLevel
      }
      if (r.status === 401 || r.status === 403) throw new GeminiError('bad_key');
      if (r.status === 429) { last = 'rate_limited'; continue; }
      if (!r.ok) continue; // 404 model gone / 5xx -> next model
      const data = await r.json();
      const raw: string = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
      const out = JSON.parse(raw);
      const title = String(out.title ?? '').trim().slice(0, 120);
      if (!title) continue;
      return {
        title,
        detail: String(out.detail ?? '').trim().slice(0, 300),
        due: validISO(out.due),
        matched: out.matched ? String(out.matched).slice(0, 60) : null,
        alternative: validISO(out.alternative),
        model,
      };
    } catch (e) {
      if (e instanceof GeminiError) throw e;
      // timeout / bad JSON -> try next model
    }
  }
  throw new GeminiError(last);
}

/** Cheap key check used by the settings dialog. */
export async function testGeminiKey(key: string): Promise<boolean> {
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': key.trim() } });
    return r.ok;
  } catch {
    return false;
  }
}
