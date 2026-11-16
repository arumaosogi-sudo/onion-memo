// Date helpers. All due dates are stored as local calendar dates "YYYY-MM-DD" (no time),
// and "days left" is counted from the device's local date, cut at local midnight.

export const WEEKDAYS_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
export const WEEKDAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
export const MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
export const MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

export const BE_OFFSET = 543;

/** Local date at 00:00. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse "YYYY-MM-DD" as a local date (not UTC). */
export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  return r;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Whole calendar days from today to due (negative = overdue). DST-safe via UTC of local parts. */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

/** "จันทร์ 23 พ.ย. 2569" */
export function formatThaiDate(d: Date, opts: { weekday?: boolean; short?: boolean } = {}): string {
  const { weekday = true, short = true } = opts;
  const month = short ? MONTHS_SHORT[d.getMonth()] : MONTHS_FULL[d.getMonth()];
  const core = `${d.getDate()} ${month} ${d.getFullYear() + BE_OFFSET}`;
  return weekday ? `${WEEKDAYS_FULL[d.getDay()]} ${core}` : core;
}

export function formatMonthYear(d: Date): string {
  return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear() + BE_OFFSET}`;
}

export type Urgency = 'overdue' | 'today' | 'urgent' | 'soon' | 'ok' | 'none';

export interface UrgencyInfo {
  level: Urgency;
  days: number | null;
  label: string;
  /** Short label for screen readers / calendar summaries. */
  short: string;
}

export function urgencyOf(dueISO: string | null, today: Date): UrgencyInfo {
  if (!dueISO) return { level: 'none', days: null, label: 'ไม่มีกำหนด', short: 'ไม่มีกำหนด' };
  const days = daysBetween(startOfDay(today), fromISODate(dueISO));
  if (days < 0) return { level: 'overdue', days, label: `เลยกำหนด ${-days} วัน`, short: 'เลยกำหนด' };
  if (days === 0) return { level: 'today', days, label: 'วันนี้', short: 'วันนี้' };
  if (days <= 3) return { level: 'urgent', days, label: `เหลือ ${days} วัน`, short: 'ด่วน' };
  if (days <= 5) return { level: 'soon', days, label: `เหลือ ${days} วัน`, short: 'ต้องเริ่มทำ' };
  return { level: 'ok', days, label: `เหลือ ${days} วัน`, short: 'ยังมีเวลา' };
}

export const URGENCY_ORDER: Record<Urgency, number> = { overdue: 0, today: 1, urgent: 2, soon: 3, ok: 4, none: 5 };

export function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'สวัสดีตอนเช้า';
  if (h < 17) return 'สวัสดีตอนบ่าย';
  return 'สวัสดีตอนเย็น';
}
