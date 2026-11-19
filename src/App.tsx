import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { URGENCY_ORDER, formatThaiDate, fromISODate, greeting, urgencyOf, type Urgency } from './lib/date';
import { parseTask } from './lib/parse';
import { aiParse } from './lib/ai';
import { useTasks, type Task } from './lib/store';
import { Mascot } from './components/Bits';
import { Calendar } from './components/Calendar';
import { ConfirmModal, EmptyState, MemoryBox, Toast, type ToastData } from './components/Extras';
import { AlertStrip, Composer, TaskCard } from './components/Home';
import { IconBox, IconHome, IconSpark } from './components/Icons';
import { AiSettings } from './components/AiSettings';
import { TaskForm, type TaskDraft } from './components/TaskForm';

type View = 'home' | 'memory';
interface Review { source: string; draft: TaskDraft; matched: string | null; alternative: string | null; by: 'ai' | 'local' }

const viewFromHash = (): View => (location.hash === '#memory' ? 'memory' : 'home');
const isWide = () => typeof matchMedia !== 'undefined' && matchMedia('(min-width: 768px)').matches;

export default function App() {
  const { tasks, storageOk, add, update, complete, restore, clearAll } = useTasks();
  const [now, setNow] = useState(() => new Date());
  const [view, setView] = useState<View>(viewFromHash);
  const [text, setText] = useState('');
  const [review, setReview] = useState<Review | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSettings, setAiSettings] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Keep "today" fresh (crossing midnight changes every badge).
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);
  useEffect(() => { const f = () => setView(viewFromHash()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  useEffect(() => { if (!storageOk) showToast('error', 'บันทึกลงเครื่องไม่ได้ ข้อมูลอาจหายเมื่อปิดหน้า'); }, [storageOk]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!newId) return; const t = setTimeout(() => setNewId(null), 2200); return () => clearTimeout(t); }, [newId]);

  const go = (v: View) => { location.hash = v === 'memory' ? 'memory' : ''; setView(v); };
  const showToast = useCallback((kind: ToastData['kind'], txt: string, action?: ToastData['action']) => setToast({ id: Date.now(), kind, text: txt, action }), []);
  const closeToast = useCallback(() => setToast(null), []);

  const open = tasks.filter((t) => t.doneAt === null);
  const counts = useMemo(() => {
    const c: Record<Urgency, number> = { overdue: 0, today: 0, urgent: 0, soon: 0, ok: 0, none: 0 };
    for (const t of open) c[urgencyOf(t.due, now).level]++;
    return c;
  }, [open, now]);

  const list = useMemo(() => {
    let l = open;
    if (urgentOnly) l = l.filter((t) => ['overdue', 'today', 'urgent'].includes(urgencyOf(t.due, now).level));
    if (day) l = l.filter((t) => t.due === day);
    return [...l].sort((a, b) => {
      // A just-added task stays on top for a moment so the user sees it, then sorts by urgency.
      if (a.id === newId) return -1; if (b.id === newId) return 1;
      const d = URGENCY_ORDER[urgencyOf(a.due, now).level] - URGENCY_ORDER[urgencyOf(b.due, now).level];
      return d || (a.due ?? '9').localeCompare(b.due ?? '9') || a.createdAt - b.createdAt;
    });
  }, [open, urgentOnly, day, now, newId]);

  const startReview = async (split: boolean) => {
    if (!split) {
      const p = parseTask(text, now);
      setReview({ source: text.trim(), draft: { title: text.trim(), detail: '', due: p.due }, matched: p.matched, alternative: p.alternative, by: 'local' });
      return;
    }
    setAiBusy(true);
    const p = await aiParse(text, new Date());
    setAiBusy(false);
    if (p.fallbackReason) showToast('error', `${p.fallbackReason} · ใช้ตัวแยกในเครื่องแทน`, p.needsKey ? { label: 'ตั้งค่า AI', run: () => setAiSettings(true) } : undefined);
    setReview({ source: text.trim(), draft: { title: p.title, detail: p.detail, due: p.due }, matched: p.matched, alternative: p.alternative, by: p.source });
  };
  const saveReview = (d: TaskDraft) => {
    const t = add(d); setReview(null); setText(''); setNewId(t.id); setDay(null); setUrgentOnly(false);
    showToast('success', 'บันทึกงานแล้ว');
  };
  const markDone = (t: Task) => {
    setLeaving(t.id); setEditing(null);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => {
      complete(t.id); setLeaving(null);
      showToast('done', 'เสร็จแล้ว · ย้ายไป Memory Box', { label: 'เลิกทำ', run: () => restore(t.id) });
    }, reduce ? 0 : 220);
  };

  const hasAny = tasks.length > 0;

  return (
    <div className="app">
      <a href="#main" className="skip">ข้ามไปเนื้อหาหลัก</a>
      <nav className="nav" aria-label="เมนูหลัก">
        <span className="logo"><Mascot size={36} />Smart Task</span>
        <button className={`nv ${view === 'home' ? 'on' : ''}`} aria-current={view === 'home' ? 'page' : undefined} onClick={() => go('home')}><IconHome />หน้าหลัก</button>
        <button className={`nv ${view === 'memory' ? 'on' : ''}`} aria-current={view === 'memory' ? 'page' : undefined} onClick={() => go('memory')}><IconBox />Memory Box</button>
        <button className="nv nv-settings" onClick={() => setAiSettings(true)}><IconSpark />ตั้งค่า AI</button>
      </nav>

      <main id="main" className="main">
        {view === 'memory' ? (
          <MemoryBox tasks={tasks} onRestore={(id) => { restore(id); showToast('success', 'กู้คืนแล้ว · กลับไปที่หน้าหลัก'); }} onClearDemo={() => setConfirmClear(true)} />
        ) : (
          <>
            <header className="hello">
              <div>
                <h1 className="h-title">{greeting(now)}</h1>
                <p className="t-sm">{formatThaiDate(now)} · มี {open.length} งาน</p>
              </div>
              <span className="hello-mascot"><Mascot size={52} /></span>
            </header>
            <div className="home-grid">
              <div className="a-alert">
                <AlertStrip counts={counts} active={urgentOnly} onToggle={() => setUrgentOnly((v) => !v)} showReschedule={isWide()}
                  onReschedule={() => { const t = list.find((x) => urgencyOf(x.due, now).level === 'overdue') ?? open.find((x) => urgencyOf(x.due, now).level === 'overdue'); if (t) setEditing(t); }} />
              </div>
              <div className="a-cal">
                <Calendar tasks={tasks} today={now} selected={day} onSelect={setDay} defaultView={isWide() ? 'month' : 'week'} />
              </div>
              <div className="a-composer">
                <Composer value={text} onChange={setText} inputRef={composerRef} busy={aiBusy} onSplit={() => startReview(true)} onAdd={() => startReview(false)} />
              </div>
              <section className="a-list" aria-labelledby="list-h">
                <div className="list-h">
                  <h2 id="list-h" className="h-sec">{day ? `งานวัน${formatThaiDate(fromISODate(day))}` : urgentOnly ? 'งานด่วน' : 'งานของฉัน'}</h2>
                  {(day || urgentOnly) ? <button className="link" onClick={() => { setDay(null); setUrgentOnly(false); }}>ดูทั้งหมด</button> : <span className="t-xs">{open.length} งาน</span>}
                </div>
                {!hasAny ? (
                  <EmptyState title="ยังไม่มีงานเลย" text="พิมพ์งานแรกในช่องด้านบน แล้วกด “ให้ AI ช่วยแยก”" />
                ) : list.length === 0 ? (
                  <EmptyState title={urgentOnly ? 'ไม่มีงานด่วน' : day ? 'วันนี้ว่าง ไม่มีงานส่ง' : 'เคลียร์งานหมดแล้ว'} text={urgentOnly || day ? 'แตะ “ดูทั้งหมด” เพื่อกลับไปดูทุกงาน' : 'งานที่เสร็จอยู่ใน Memory Box'} />
                ) : (
                  <div className="list">
                    {list.map((t) => (
                      <TaskCard key={t.id} task={t} today={now} leaving={leaving === t.id} isNew={newId === t.id}
                        onOpen={() => setEditing(t)} onDone={() => markDone(t)} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>

      <Toast toast={toast} onClose={closeToast} />

      {review && (
        <TaskForm mode="review" initial={review.draft} source={review.source} matched={review.matched} alternative={review.alternative} by={review.by}
          onSave={saveReview} onCancel={() => setReview(null)}
          onBackToText={() => { setReview(null); setTimeout(() => composerRef.current?.focus(), 0); }} />
      )}
      {editing && (
        <TaskForm mode="edit" initial={{ title: editing.title, detail: editing.detail, due: editing.due }}
          onSave={(d) => { update(editing.id, d); setEditing(null); showToast('success', 'บันทึกการแก้ไขแล้ว'); }}
          onCancel={() => setEditing(null)} onDone={() => markDone(editing)} />
      )}
      {aiSettings && <AiSettings onClose={() => setAiSettings(false)} onSaved={(m) => showToast('success', m)} />}
      {confirmClear && (
        <ConfirmModal title="ล้างข้อมูลทั้งหมด?"
          body={`งานทั้งหมด ${tasks.length} รายการ (ค้างอยู่ ${open.length} · ใน Memory Box ${tasks.length - open.length}) จะหายจากเครื่องนี้ และกู้คืนไม่ได้`}
          confirmLabel={`ล้าง ${tasks.length} รายการ`}
          onConfirm={() => { clearAll(); setConfirmClear(false); go('home'); showToast('success', 'ล้างข้อมูลแล้ว'); }}
          onCancel={() => setConfirmClear(false)} />
      )}
    </div>
  );
}
