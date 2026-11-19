import { useEffect, useRef, useState } from 'react';
import { formatThaiDate, fromISODate, urgencyOf, type Urgency } from '../lib/date';
import type { Task } from '../lib/store';
import { StatusBadge } from './Bits';
import { IconExclaim, IconFlame, IconSpark } from './Icons';

export function AlertStrip({ counts, active, onToggle, onReschedule, showReschedule }: {
  counts: Record<Urgency, number>; active: boolean; onToggle: () => void; onReschedule: () => void; showReschedule: boolean;
}) {
  const urgent = counts.overdue + counts.today + counts.urgent;
  if (!urgent) {
    return <div className="alert calm" role="status"><span>วันนี้ไม่มีงานด่วน พักหายใจสบายๆ ได้เลย</span></div>;
  }
  return (
    <div className="alert-wrap">
      <button className={`alert ${active ? 'on' : ''}`} aria-pressed={active} onClick={onToggle}
        aria-label={`เลยกำหนด ${counts.overdue} งาน วันนี้ ${counts.today} งาน ด่วน ${counts.urgent} งาน ${active ? 'แตะเพื่อดูทั้งหมด' : 'แตะเพื่อกรองเฉพาะงานด่วน'}`}>
        {counts.overdue > 0 && <span className="it"><span className="dot-ex"><IconExclaim width={12} height={12} /></span>เลยกำหนด {counts.overdue}</span>}
        {counts.today > 0 && <span className="it"><IconFlame width={14} height={14} className="ic-urgent" />วันนี้ {counts.today}</span>}
        {counts.urgent > 0 && <span className="it">ด่วน {counts.urgent}</span>}
        <span className="go">{active ? 'ดูทั้งหมด' : 'ดูงาน ›'}</span>
      </button>
      {showReschedule && counts.overdue > 0 && <button className="btn s sm" onClick={onReschedule}>เลื่อนวัน</button>}
    </div>
  );
}

export function Composer({ value, onChange, onSplit, onAdd, inputRef, busy }: {
  value: string; onChange: (v: string) => void; onSplit: () => void; onAdd: () => void; busy: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}) {
  const [focus, setFocus] = useState(false);
  // Grow in place (pushes content down; never an overlay).
  useEffect(() => {
    const el = inputRef.current; if (!el) return;
    el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value, inputRef]);
  const empty = value.trim() === '';
  return (
    <section className={`surface composer ${focus || !empty ? 'typing' : ''}`} aria-label="เพิ่มงานใหม่">
      <label htmlFor="composer" className="sr-only">พิมพ์งานใหม่</label>
      <textarea id="composer" ref={inputRef} rows={1} value={value} onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !empty && !busy) onSplit(); }}
        placeholder='พิมพ์งาน เช่น "project seminar ทำกับเพื่อน ผมทำหน้าบ้านกับหลังบ้าน ส่ง 30 เดือนนี้"' />
      <div className="row">
        <button className="btn s sm grow" onClick={onSplit} disabled={empty || busy} aria-busy={busy}>
          <IconSpark width={16} height={16} className={busy ? 'spin' : undefined} />{busy ? 'AI กำลังอ่าน…' : 'ให้ AI ช่วยแยก'}
        </button>
        <button className="btn p sm" onClick={onAdd} disabled={empty || busy}>+ เพิ่ม</button>
      </div>
    </section>
  );
}

export function TaskCard({ task, today, onOpen, onDone, leaving, isNew }: {
  task: Task; today: Date; onOpen: () => void; onDone: () => void; leaving: boolean; isNew: boolean;
}) {
  const u = urgencyOf(task.due, today);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { if (isNew) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [isNew]);
  const meta = [task.detail, task.due ? formatThaiDate(fromISODate(task.due)) : 'ยังไม่ได้ตั้งวันส่ง'].filter(Boolean).join(' · ');
  return (
    <article ref={ref} className={`surface card lv-${u.level} ${leaving ? 'leaving' : ''} ${isNew ? 'is-new' : ''}`}>
      <div className="top">
        <h3 className="title">{task.title}</h3>
        <StatusBadge level={u.level} label={u.label} />
      </div>
      <p className="t-sm meta">{meta}</p>
      <div className="acts">
        <button className="btn g sm" onClick={onOpen}>แก้ไข</button>
        <button className="btn p sm" onClick={onDone}>เสร็จงานแล้ว</button>
      </div>
    </article>
  );
}
