import { useId, useState } from 'react';
import { formatThaiDate, fromISODate, urgencyOf } from '../lib/date';
import { Mascot, StatusBadge } from './Bits';
import { IconCalendar, IconWarn } from './Icons';
import { Modal } from './Modal';

export interface TaskDraft { title: string; detail: string; due: string | null }

/**
 * One form for both the Review Board (after typing) and Detail/Edit.
 * mode "review": shows the original sentence, where the date was read from, and an alternative date.
 */
export function TaskForm({ mode, initial, source, matched, alternative, onSave, onCancel, onBackToText, onDone }: {
  mode: 'review' | 'edit';
  initial: TaskDraft;
  source?: string;
  matched?: string | null;
  alternative?: string | null;
  onSave: (d: TaskDraft) => void;
  onCancel: () => void;
  onBackToText?: () => void;
  onDone?: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [detail, setDetail] = useState(initial.detail);
  const [due, setDue] = useState<string | null>(initial.due);
  const [noDate, setNoDate] = useState(initial.due === null && mode === 'edit');
  const ids = { h: useId(), t: useId(), d: useId(), due: useId(), hint: useId() };
  const today = new Date();
  const u = urgencyOf(due, today);
  const titleMissing = title.trim() === '';
  const needsDate = due === null && !noDate;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (titleMissing) return;
    onSave({ title: title.trim(), detail: detail.trim(), due: noDate ? null : due });
  };

  return (
    <Modal labelledBy={ids.h} onClose={onCancel}>
      <form className="form" onSubmit={submit} noValidate>
        <div className="form-head">
          <Mascot size={44} />
          <div>
            <h2 id={ids.h} className="h-sec">{mode === 'review' ? 'ตรวจงานก่อนบันทึกนะ' : 'รายละเอียดงาน'}</h2>
            <p className="t-xs">{mode === 'review' ? 'แก้ได้ทุกช่อง ก่อนกดบันทึก' : 'แก้ไขแล้วกดบันทึก'}</p>
          </div>
        </div>

        {mode === 'review' && source && <p className="quote">ข้อความที่พิมพ์: “{source}”</p>}

        <div className="field">
          <label htmlFor={ids.t}>หัวข้องาน</label>
          <input id={ids.t} className="inp" value={title} onChange={(e) => setTitle(e.target.value)}
            aria-invalid={titleMissing} data-autofocus={mode === 'edit' ? true : undefined} />
          {titleMissing && <span className="hint warn"><IconWarn width={16} height={16} />ใส่หัวข้องานก่อนบันทึก</span>}
        </div>

        <div className="field">
          <label htmlFor={ids.d}>รายละเอียด</label>
          <textarea id={ids.d} className="inp area" rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="ไม่ใส่ก็ได้" />
        </div>

        <div className="field">
          <label htmlFor={ids.due}>
            วันส่ง {matched && <em>อ่านจาก “{matched}”</em>}
          </label>
          <div className={`inp date-inp ${needsDate ? 'warn' : ''}`}>
            <IconCalendar width={18} height={18} className="ic-brand" />
            <span className="date-text">{due ? formatThaiDate(fromISODate(due)) : 'ยังไม่ระบุวัน · แตะเพื่อเลือก'}</span>
            <input id={ids.due} type="date" className="date-native" value={due ?? ''} aria-describedby={ids.hint}
              disabled={noDate} onChange={(e) => setDue(e.target.value || null)} aria-label="เลือกวันส่ง" />
          </div>
          <div className="row wrap" id={ids.hint}>
            {due && !noDate && <StatusBadge level={u.level} label={u.label} />}
            {alternative && due !== alternative && (
              <button type="button" className="link" onClick={() => setDue(alternative)}>
                ถ้าหมายถึง {formatThaiDate(fromISODate(alternative))} แตะที่นี่
              </button>
            )}
            {mode === 'review' && initial.due === null && !noDate && (
              <span className="hint warn"><IconWarn width={16} height={16} />ไม่พบวันที่ในข้อความ เลือกวันส่ง หรือบันทึกแบบไม่มีกำหนดก็ได้</span>
            )}
          </div>
          <label className="check">
            <input type="checkbox" checked={noDate} onChange={(e) => setNoDate(e.target.checked)} /> ไม่มีกำหนดส่ง
          </label>
        </div>

        <div className="acts">
          {onDone && <button type="button" className="btn s sm" onClick={onDone}>เสร็จงานแล้ว</button>}
          <span className="grow" />
          <button type="button" className="btn g sm" onClick={onCancel}>ยกเลิก</button>
          {onBackToText && <button type="button" className="btn s sm" onClick={onBackToText}>กลับไปแก้ข้อความ</button>}
          <button type="submit" className="btn p" disabled={titleMissing}>บันทึกงาน</button>
        </div>
      </form>
    </Modal>
  );
}
