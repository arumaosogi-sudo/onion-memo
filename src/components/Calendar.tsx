import { useMemo, useState } from 'react';
import {
  WEEKDAYS_FULL, WEEKDAYS_SHORT, URGENCY_ORDER, addDays, formatMonthYear, formatThaiDate,
  sameDay, startOfDay, toISODate, urgencyOf, type Urgency,
} from '../lib/date';
import type { Task } from '../lib/store';
import { Marker } from './Bits';
import { IconChevron } from './Icons';

interface DayInfo { count: number; worst: Urgency | null; urgentCount: number }

function summarize(tasks: Task[], today: Date): Map<string, DayInfo> {
  const m = new Map<string, DayInfo>();
  for (const t of tasks) {
    if (!t.due || t.doneAt) continue;
    const lv = urgencyOf(t.due, today).level;
    const cur = m.get(t.due) ?? { count: 0, worst: null, urgentCount: 0 };
    cur.count++;
    if (lv === 'overdue' || lv === 'today' || lv === 'urgent') cur.urgentCount++;
    if (!cur.worst || URGENCY_ORDER[lv] < URGENCY_ORDER[cur.worst]) cur.worst = lv;
    m.set(t.due, cur);
  }
  return m;
}

export function Calendar({ tasks, today, selected, onSelect, defaultView }: {
  tasks: Task[]; today: Date; selected: string | null; onSelect: (iso: string | null) => void; defaultView: 'week' | 'month';
}) {
  const [view, setView] = useState<'week' | 'month'>(defaultView);
  const [cursor, setCursor] = useState(() => startOfDay(today));
  const info = useMemo(() => summarize(tasks, today), [tasks, today]);

  const days: Date[] = useMemo(() => {
    if (view === 'week') {
      const start = addDays(cursor, -cursor.getDay());
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    const weeks = Math.ceil((first.getDay() + new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()) / 7);
    return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  }, [view, cursor]);

  const move = (dir: 1 | -1) => setCursor((c) => (view === 'week' ? addDays(c, 7 * dir) : new Date(c.getFullYear(), c.getMonth() + dir, 1)));

  return (
    <section className="surface cal" aria-label="ปฏิทินงาน">
      <div className="cal-h">
        <button className="icon-btn" onClick={() => move(-1)} aria-label={view === 'week' ? 'สัปดาห์ก่อน' : 'เดือนก่อน'}><IconChevron dir="left" /></button>
        <h2 className="h-sec cal-title">{formatMonthYear(view === 'week' ? addDays(cursor, 3 - cursor.getDay()) : cursor)}</h2>
        <button className="icon-btn" onClick={() => move(1)} aria-label={view === 'week' ? 'สัปดาห์ถัดไป' : 'เดือนถัดไป'}><IconChevron /></button>
        <div className="seg" role="group" aria-label="มุมมองปฏิทิน">
          <button aria-pressed={view === 'week'} onClick={() => setView('week')}>สัปดาห์</button>
          <button aria-pressed={view === 'month'} onClick={() => setView('month')}>เดือน</button>
        </div>
      </div>
      <div className={`grid7 ${view}`}>
        {WEEKDAYS_SHORT.map((w, i) => <span key={w} className="dw" aria-hidden="true" title={WEEKDAYS_FULL[i]}>{w}</span>)}
        {days.map((d) => {
          const iso = toISODate(d);
          const di = info.get(iso);
          const isToday = sameDay(d, today);
          const isSel = selected === iso;
          const outside = view === 'month' && d.getMonth() !== cursor.getMonth();
          const sr = `${formatThaiDate(d)}${isToday ? ' วันนี้' : ''}${di ? `, ${di.count} งาน${di.urgentCount ? `, ${di.urgentCount} ด่วน` : ''}` : ', ไม่มีงาน'}`;
          return (
            <button key={iso} className={`day ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''} ${outside ? 'out' : ''}`}
              aria-label={sr} aria-pressed={isSel} onClick={() => onSelect(isSel ? null : iso)}>
              <span className="dn">{d.getDate()}</span>
              <span className="mks">
                {di?.worst && <Marker level={di.worst} />}
                {di && di.count > 1 && <span className="cnt">{di.count}</span>}
              </span>
            </button>
          );
        })}
      </div>
      <div className="legend" aria-hidden="true">
        <span><Marker level="overdue" />เลยกำหนด</span><span><Marker level="urgent" />วันนี้/ด่วน</span>
        <span><Marker level="soon" />ต้องเริ่มทำ</span><span><Marker level="ok" />ยังมีเวลา</span>
      </div>
    </section>
  );
}
