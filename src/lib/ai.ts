// "ให้ AI ช่วยแยก": ask the Gemini proxy (Vercel function), fall back to the offline Thai parser.
import { toISODate } from './date';
import { parseTask, type ParseResult } from './parse';

const ENDPOINT: string = import.meta.env.VITE_AI_ENDPOINT || 'https://smart-task-tracker-blue.vercel.app/api/parse';

export interface AiResult extends ParseResult {
  source: 'ai' | 'local';
  /** Why we fell back to the local parser (shown as a toast). */
  fallbackReason?: string;
}

const REASONS: Record<string, string> = {
  ai_not_configured: 'ยังไม่ได้ตั้งค่า AI บนเซิร์ฟเวอร์',
  rate_limited: 'ใช้ AI ถี่เกินไป รอสักครู่',
  ai_failed: 'AI ตอบไม่ได้ตอนนี้',
};

export async function aiParse(text: string, now = new Date()): Promise<AiResult> {
  const local = (reason: string): AiResult => ({ ...parseTask(text, now), source: 'local', fallbackReason: reason });
  if (!navigator.onLine) return local('ออฟไลน์อยู่');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, today: toISODate(now) }),
      signal: ctrl.signal,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.title) return local(REASONS[data.error] ?? 'เชื่อมต่อ AI ไม่สำเร็จ');
    return {
      title: data.title, detail: data.detail ?? '', due: data.due ?? null,
      matched: data.matched ?? null, alternative: data.alternative ?? null, source: 'ai',
    };
  } catch {
    return local('เชื่อมต่อ AI ไม่สำเร็จ');
  } finally {
    clearTimeout(timer);
  }
}
