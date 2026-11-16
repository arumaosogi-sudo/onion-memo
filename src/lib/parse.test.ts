import { describe, expect, it } from 'vitest';
import { parseTask } from './parse';
import { urgencyOf, formatThaiDate, fromISODate } from './date';

// Reference "today" = Sunday 15 Nov 2026 (2569 B.E.), 09:00 local.
const NOW = new Date(2026, 10, 15, 9, 0);

describe('parseTask', () => {
  it('splits title / detail and reads "วันจันทร์หน้า" with an alternative', () => {
    const r = parseTask('ส่งรายงานวิทย์ สรุปบทที่ 3-4 วันจันทร์หน้า', NOW);
    expect(r.title).toBe('ส่งรายงานวิทย์');
    expect(r.detail).toBe('สรุปบทที่ 3-4');
    expect(r.due).toBe('2026-11-23');
    expect(r.alternative).toBe('2026-11-16');
    expect(r.matched).toBe('วันจันทร์หน้า');
  });

  it('reads "จันทร์หน้า" mid-week without ambiguity', () => {
    const wed = new Date(2026, 10, 18, 9);
    const r = parseTask('ส่งการบ้าน จันทร์หน้า', wed);
    expect(r.due).toBe('2026-11-23');
    expect(r.alternative).toBeNull();
  });

  it('reads relative words', () => {
    expect(parseTask('อ่านหนังสือพรุ่งนี้', NOW).due).toBe('2026-11-16');
    expect(parseTask('ซื้อของมะรืนนี้', NOW).due).toBe('2026-11-17');
    expect(parseTask('ทำการบ้านวันนี้', NOW).due).toBe('2026-11-15');
    expect(parseTask('ส่งงานอีก 4 วัน', NOW).due).toBe('2026-11-19');
  });

  it('reads Thai absolute dates with B.E. year', () => {
    expect(parseTask('สอบปลายภาค 5 ธ.ค. 2569', NOW).due).toBe('2026-12-05');
    expect(parseTask('สอบ 5 ธันวาคม', NOW).due).toBe('2026-12-05');
    expect(parseTask('ส่งเล่ม 23/11/69', NOW).due).toBe('2026-11-23');
  });

  it('rolls a past day-month without year into next year', () => {
    expect(parseTask('สมัครค่าย 3 ม.ค.', NOW).due).toBe('2027-01-03');
  });

  it('does not guess when there is no date', () => {
    const r = parseTask('จัดโต๊ะทำงานให้เรียบร้อย', NOW);
    expect(r.due).toBeNull();
    expect(r.title).toBe('จัดโต๊ะทำงานให้เรียบร้อย');
  });

  it('drops dangling words before the date', () => {
    expect(parseTask('ส่งรายงานฟิสิกส์ภายในวันศุกร์นี้', NOW).title).toBe('ส่งรายงานฟิสิกส์');
  });
});

describe('urgencyOf', () => {
  it('maps days to the 6 levels', () => {
    expect(urgencyOf('2026-11-13', NOW)).toMatchObject({ level: 'overdue', label: 'เลยกำหนด 2 วัน' });
    expect(urgencyOf('2026-11-15', NOW).level).toBe('today');
    expect(urgencyOf('2026-11-17', NOW)).toMatchObject({ level: 'urgent', label: 'เหลือ 2 วัน' });
    expect(urgencyOf('2026-11-19', NOW).level).toBe('soon');
    expect(urgencyOf('2026-11-22', NOW).level).toBe('ok');
    expect(urgencyOf(null, NOW).level).toBe('none');
  });

  it('formats Thai dates with weekday and B.E. year', () => {
    expect(formatThaiDate(fromISODate('2026-11-23'))).toBe('จันทร์ 23 พ.ย. 2569');
  });
});
