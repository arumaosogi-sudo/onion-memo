// Vercel Serverless Function: POST /api/parse
// Turns one free-form Thai sentence into { title, detail, due, matched, alternative } using Gemini.
// The Gemini key lives only in the Vercel env var GEMINI_API_KEY — never in the browser bundle.

const ALLOWED_ORIGINS = [
  'https://arumaosogi-sudo.github.io',
  'https://smart-task-tracker-blue.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
const MAX_CHARS = 600;
// Fast, current models first (checked against ListModels on 2026-11-19). Override with GEMINI_MODEL.
const MODELS = [process.env.GEMINI_MODEL, 'gemini-3.5-flash-lite', 'gemini-3.5-flash'].filter(Boolean) as string[];
const WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

// Best-effort per-instance rate limit (20 requests / minute / IP).
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 20;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
function validISO(s: unknown): string | null {
  if (typeof s !== 'string' || !ISO.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? s : null;
}
function serverToday(): string {
  // Asia/Bangkok calendar date
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

function systemPrompt(today: string): string {
  const [y, m, d] = today.split('-').map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `คุณคือผู้ช่วยแยกข้อความ "งานที่ต้องทำ" ภาษาไทยของนักเรียน/นักศึกษา ให้ตอบเป็น JSON ตาม schema เท่านั้น
วันนี้คือวัน${wd}ที่ ${today} (ปี ค.ศ.; ปี พ.ศ. = ค.ศ. + 543) สัปดาห์เริ่มวันอาทิตย์ เขตเวลา Asia/Bangkok

กติกา
1. title: ชื่องานสั้น กระชับ 3–60 ตัวอักษร ขึ้นต้นด้วยคำกริยาหรือชื่องาน เช่น "ส่งรายงานวิทย์", "ทำ Project Seminar" ห้ามใส่วันที่ในชื่อ คงคำภาษาอังกฤษ/ชื่อเฉพาะไว้ตามเดิม
2. detail: ใจความสำคัญที่เหลือ เช่น หน้าที่ที่รับผิดชอบ ทำกับใคร ขอบเขตงาน เขียนเป็นวลีสั้นๆ คั่นด้วย " · " ถ้าไม่มีให้เป็น "" ตัดคำฟุ่มเฟือย เช่น "ผมมี", "ครับ", "นะ"
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

async function callGemini(key: string, model: string, text: string, today: string, lowThinking = true) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
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
    return r;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req: any, res: any) {
  const origin = String(req.headers.origin ?? '');
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return res.status(403).json({ error: 'origin_not_allowed' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: 'ai_not_configured' });

  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ error: 'rate_limited' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
  const text = String(body.text ?? '').trim().slice(0, MAX_CHARS);
  if (!text) return res.status(400).json({ error: 'empty_text' });
  // Use the device's local date when it is plausible (±2 days of server date); else server date.
  const sToday = serverToday();
  const cToday = validISO(body.today);
  const diff = cToday ? Math.abs(Date.parse(cToday) - Date.parse(sToday)) / 86_400_000 : 99;
  const today = cToday && diff <= 2 ? cToday : sToday;

  let lastStatus = 0;
  for (const model of MODELS) {
    try {
      let r = await callGemini(key, model, text, today);
      if (r.status === 400) r = await callGemini(key, model, text, today, false); // model without thinkingLevel
      lastStatus = r.status;
      if (r.status === 404 || r.status === 429 || r.status >= 500) continue; // try next model
      if (!r.ok) break;
      const data: any = await r.json();
      const raw = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
      const out = JSON.parse(raw);
      const title = String(out.title ?? '').trim().slice(0, 120);
      if (!title) break;
      return res.status(200).json({
        title,
        detail: String(out.detail ?? '').trim().slice(0, 300),
        due: validISO(out.due),
        matched: out.matched ? String(out.matched).slice(0, 60) : null,
        alternative: validISO(out.alternative),
        model,
      });
    } catch {
      lastStatus = 504; // timeout or bad JSON -> try next model
      continue;
    }
  }
  return res.status(502).json({ error: 'ai_failed', upstream: lastStatus });
}
