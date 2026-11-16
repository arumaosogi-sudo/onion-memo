// Offline Thai task parser: splits one sentence into title / detail / due date.
// It never guesses silently: if no date phrase is found, `due` is null and the UI
// shows "ยังไม่ระบุวัน". Ambiguous phrases (e.g. "จันทร์หน้า") return an alternative.
import { addDays, startOfDay, toISODate } from './date';

export interface ParseResult {
  title: string;
  detail: string;
  due: string | null;
  /** The exact words the date was read from, shown to the user ("อ่านจาก ..."). */
  matched: string | null;
  /** A second plausible reading of an ambiguous phrase. */
  alternative: string | null;
}

const WEEKDAY_WORDS: [RegExp, number][] = [
  [/อาทิตย์/, 0], [/จันทร์/, 1], [/อังคาร/, 2], [/พุธ/, 3], [/พฤหัส(?:บดี)?/, 4], [/ศุกร์/, 5], [/เสาร์/, 6],
];

// Order matters: longer / dotted forms first.
const MONTH_WORDS: [string, number][] = [
  ['มกราคม', 0], ['กุมภาพันธ์', 1], ['มีนาคม', 2], ['เมษายน', 3], ['พฤษภาคม', 4], ['มิถุนายน', 5],
  ['กรกฎาคม', 6], ['สิงหาคม', 7], ['กันยายน', 8], ['ตุลาคม', 9], ['พฤศจิกายน', 10], ['ธันวาคม', 11],
  ['ม.ค.', 0], ['ก.พ.', 1], ['มี.ค.', 2], ['เม.ย.', 3], ['พ.ค.', 4], ['มิ.ย.', 5],
  ['ก.ค.', 6], ['ส.ค.', 7], ['ก.ย.', 8], ['ต.ค.', 9], ['พ.ย.', 10], ['ธ.ค.', 11],
  ['มค', 0], ['กพ', 1], ['มีค', 2], ['เมย', 3], ['พค', 4], ['มิย', 5],
  ['กค', 6], ['สค', 7], ['กย', 8], ['ตค', 9], ['พย', 10], ['ธค', 11],
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MONTH_ALT = MONTH_WORDS.map(([w]) => escape(w)).join('|');

interface DateHit { start: number; end: number; due: Date; alternative: Date | null }

function resolveYear(raw: string | undefined, month: number, day: number, today: Date): number {
  if (raw) {
    let y = Number(raw);
    if (raw.length <= 2) y = 2500 + y; // "69" -> 2569 (B.E.)
    if (y > 2400) y -= 543; // B.E. -> C.E.
    return y;
  }
  // No year: this year, or next year if the date already passed.
  const candidate = new Date(today.getFullYear(), month, day);
  return candidate < today ? today.getFullYear() + 1 : today.getFullYear();
}

function validDate(y: number, m: number, d: number): Date | null {
  const dt = new Date(y, m, d);
  return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d ? dt : null;
}

function findDate(text: string, today: Date): DateHit | null {
  const hits: DateHit[] = [];
  const push = (m: RegExpExecArray, due: Date | null, alternative: Date | null = null) => {
    if (due) hits.push({ start: m.index, end: m.index + m[0].length, due, alternative });
  };
  let m: RegExpExecArray | null;

  // Absolute: "23 พ.ย. 2569", "23 พฤศจิกายน", "23พย69"
  const reAbs = new RegExp(`(?:วันที่\\s*)?(\\d{1,2})\\s*(${MONTH_ALT})\\s*(\\d{4}|\\d{2}(?!\\d))?`, 'g');
  while ((m = reAbs.exec(text))) {
    const month = MONTH_WORDS.find(([w]) => w === m![2])![1];
    const day = Number(m[1]);
    push(m, validDate(resolveYear(m[3], month, day, today), month, day));
  }
  // Numeric: "23/11", "23/11/2569"
  const reNum = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g;
  while ((m = reNum.exec(text))) {
    const day = Number(m[1]); const month = Number(m[2]) - 1;
    push(m, validDate(resolveYear(m[3], month, day, today), month, day));
  }
  // Relative words
  const rel: [RegExp, number][] = [[/มะรืน(?:นี้)?/g, 2], [/พรุ่งนี้/g, 1], [/วันนี้/g, 0]];
  for (const [re, n] of rel) while ((m = re.exec(text))) push(m, addDays(today, n));
  const reIn = /(?:อีก|ภายใน)\s*(\d{1,3})\s*วัน/g;
  while ((m = reIn.exec(text))) push(m, addDays(today, Number(m[1])));

  // Weekdays: "วันจันทร์หน้า", "ศุกร์นี้", "วันพุธ"
  for (const [wre, wd] of WEEKDAY_WORDS) {
    const re = new RegExp(`(?:วัน)?${wre.source}(หน้า|นี้)?`, 'g');
    while ((m = re.exec(text))) {
      // Skip "อาทิตย์หน้า" used as "next week" only when not preceded by "วัน" — handled below.
      if (wd === 0 && !m[0].startsWith('วัน') && m[1] === 'หน้า') continue;
      const ahead = (wd - today.getDay() + 7) % 7; // 0..6 (today counts)
      const upcoming = addDays(today, ahead);
      if (m[1] === 'หน้า') {
        const nextOne = ahead === 0 ? addDays(today, 7) : upcoming;
        // Weeks start on Sunday. If the next occurrence is still in this week,
        // "หน้า" most likely means the one in next week — offer the nearer one as an alternative.
        const sameWeek = nextOne.getDay() > today.getDay() && ahead !== 0;
        push(m, sameWeek ? addDays(nextOne, 7) : nextOne, sameWeek ? nextOne : null);
      } else {
        push(m, upcoming);
      }
    }
  }
  // "สัปดาห์หน้า" / "อาทิตย์หน้า" (next week, no weekday)
  const reWeek = /(?<!วัน)(?:สัปดาห์|อาทิตย์)หน้า/g;
  while ((m = reWeek.exec(text))) push(m, addDays(today, 7));

  if (!hits.length) return null;
  // Prefer the longest match (most specific); ties -> earliest.
  hits.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start);
  return hits[0];
}

const SPLIT_MARKERS = /\n|,|，| - | – |:|\s(?=(?:สรุป|รายละเอียด|โดย|พร้อม|ทำ(?:บท|ข้อ)|อ่านบท|บทที่))/;
const DANGLING = /\s*(?:ส่ง(?:ภายใน|ก่อน)?|ภายใน|ก่อน|ถึง|ใน|ที่|ของ)\s*$/;

export function parseTask(input: string, now: Date = new Date()): ParseResult {
  const today = startOfDay(now);
  const text = input.replace(/\s+/g, ' ').trim();
  const hit = findDate(text, today);
  let rest = text;
  let matched: string | null = null;
  if (hit) {
    matched = text.slice(hit.start, hit.end).trim();
    rest = (text.slice(0, hit.start) + ' ' + text.slice(hit.end)).replace(/\s+/g, ' ').trim();
  }
  rest = rest.replace(DANGLING, '').trim();

  let title = rest;
  let detail = '';
  const idx = rest.search(SPLIT_MARKERS);
  if (idx > 0) {
    title = rest.slice(0, idx).trim();
    detail = rest.slice(idx).replace(/^[\s,，:\-–]+/, '').trim();
  }
  title = title.replace(DANGLING, '').trim();
  detail = detail.replace(DANGLING, '').trim();
  if (!title && detail) { title = detail; detail = ''; }

  return {
    title,
    detail,
    due: hit ? toISODate(hit.due) : null,
    matched,
    alternative: hit?.alternative ? toISODate(hit.alternative) : null,
  };
}
