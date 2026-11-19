// "ให้ AI ช่วยแยก": Gemini (key from this browser's settings), falling back to the offline Thai parser.
import { toISODate } from './date';
import { GeminiError, geminiParse } from './gemini';
import { parseTask, type ParseResult } from './parse';

export interface AiResult extends ParseResult {
  source: 'ai' | 'local';
  /** Why we fell back to the local parser (shown as a toast). */
  fallbackReason?: string;
  needsKey?: boolean;
}

const REASONS: Record<GeminiError['code'], string> = {
  no_key: 'ยังไม่ได้ใส่ Gemini API key',
  bad_key: 'Gemini API key ใช้ไม่ได้',
  rate_limited: 'ใช้ AI ถี่เกินโควตา รอสักครู่',
  failed: 'AI ตอบไม่ได้ตอนนี้',
};

export async function aiParse(text: string, now = new Date()): Promise<AiResult> {
  const local = (reason: string, needsKey = false): AiResult => ({ ...parseTask(text, now), source: 'local', fallbackReason: reason, needsKey });
  if (!navigator.onLine) return local('ออฟไลน์อยู่');
  try {
    const r = await geminiParse(text, toISODate(now));
    return { title: r.title, detail: r.detail, due: r.due, matched: r.matched, alternative: r.alternative, source: 'ai' };
  } catch (e) {
    const code = e instanceof GeminiError ? e.code : 'failed';
    return local(REASONS[code], code === 'no_key' || code === 'bad_key');
  }
}
