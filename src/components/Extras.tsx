import { useEffect, useId } from 'react';
import { formatThaiDate } from '../lib/date';
import { memoryDaysLeft, MEMORY_DAYS, type Task } from '../lib/store';
import { Mascot } from './Bits';
import { IconTrash, IconWarn, IconX } from './Icons';
import { Modal } from './Modal';

export interface ToastData { id: number; kind: 'success' | 'done' | 'error'; text: string; onUndo?: () => void }

export function Toast({ toast, onClose }: { toast: ToastData | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, toast.onUndo ? 9000 : 4000);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  return (
    <div className="toast-zone" aria-live="polite" role="status">
      {toast && (
        <div key={toast.id} className={`toast t-${toast.kind}`}>
          <span className="grow">{toast.kind === 'error' ? '⚠ ' : '✓ '}{toast.text}</span>
          {toast.onUndo && <button className="toast-btn" onClick={() => { toast.onUndo!(); onClose(); }}>เลิกทำ</button>}
          <button className="toast-x" onClick={onClose} aria-label="ปิดข้อความ"><IconX width={18} height={18} /></button>
        </div>
      )}
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <Mascot size={72} mood="calm" />
      <h3 className="h-sec">{title}</h3>
      <p className="t-sm">{text}</p>
    </div>
  );
}

export function MemoryBox({ tasks, onRestore, onClearDemo }: { tasks: Task[]; onRestore: (id: string) => void; onClearDemo: () => void }) {
  const done = tasks.filter((t) => t.doneAt !== null).sort((a, b) => b.doneAt! - a.doneAt!);
  return (
    <div className="col page">
      <header className="page-head">
        <h1 className="h-title">Memory Box</h1>
        <p className="t-sm">งานที่เสร็จจะอยู่ที่นี่ {MEMORY_DAYS} วันนับจากวันที่กดเสร็จ แล้วถูกลบอัตโนมัติ</p>
      </header>
      {done.length === 0
        ? <EmptyState title="ยังไม่มีงานที่เสร็จ" text="กด “เสร็จงานแล้ว” ที่การ์ดงาน แล้วงานจะมาอยู่ที่นี่" />
        : (
          <ul className="list" aria-label="งานที่เสร็จแล้ว">
            {done.map((t) => {
              const left = memoryDaysLeft(t.doneAt!);
              const soon = left <= 3;
              return (
                <li key={t.id} className={`surface memory ${soon ? 'soon' : ''}`}>
                  <div className="grow">
                    <p className="memory-title">{t.title}</p>
                    <p className="t-xs">เสร็จเมื่อ {formatThaiDate(new Date(t.doneAt!), { weekday: false })}</p>
                    <p className={`t-xs expire ${soon ? 'warn' : ''}`}>
                      {soon ? <IconWarn width={14} height={14} /> : <IconTrash width={14} height={14} />}
                      {soon ? `เหลือ ${left} วันก่อนถูกลบ` : `จะถูกลบใน ${left} วัน`}
                    </p>
                  </div>
                  <button className="btn s sm" onClick={() => onRestore(t.id)}>กู้คืน</button>
                </li>
              );
            })}
          </ul>
        )}
      <button className="btn g sm danger self-start" onClick={onClearDemo}>ล้างข้อมูลทั้งหมด…</button>
    </div>
  );
}

export function ConfirmModal({ title, body, confirmLabel, onConfirm, onCancel }: {
  title: string; body: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void;
}) {
  const id = useId();
  return (
    <Modal labelledBy={id} onClose={onCancel} size="sm">
      <div className="form">
        <h2 id={id} className="h-sec">{title}</h2>
        <p className="t-body">{body}</p>
        <div className="acts">
          <span className="grow" />
          <button className="btn g sm" onClick={onCancel} data-autofocus>ยกเลิก</button>
          <button className="btn danger-p" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  );
}
