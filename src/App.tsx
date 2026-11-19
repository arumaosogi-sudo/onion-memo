import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { URGENCY_ORDER, formatThaiDate, fromISODate, greeting, urgencyOf, type Urgency } from './lib/date';
import { parseTask } from './lib/parse';
import { aiParse } from './lib/ai';
import { useTasks, type Task } from './lib/store';
import { useAccount } from './lib/account';
import { getGeminiKey, setGeminiKey } from './lib/gemini';
import { AccountPanel } from './components/AccountPanel';
import { Mascot } from './components/Bits';
import { Calendar } from './components/Calendar';
import { ConfirmModal, EmptyState, MemoryBox, Toast, type ToastData } from './components/Extras';
import { AlertStrip, Composer, TaskCard } from './components/Home';
import { IconBox, IconHome, IconStar, IconUser } from './components/Icons';
import { AiSettings } from './components/AiSettings';
import { TaskForm, type TaskDraft } from './components/TaskForm';

type View = 'home' | 'memory';
interface Review { source: string; draft: TaskDraft; matched: string | null; alternative: string | null; by: 'ai' | 'local' }

const viewFromHash = (): View => (location.hash === '#memory' ? 'memory' : 'home');
const isWide = () => typeof matchMedia !== 'undefined' && matchMedia('(min-width: 768px)').matches;

export default function App() {
  const account = useAccount();
  const uid = account.user?.uid ?? null;
  const [toast, setToast] = useState<ToastData | null>(null);
  const showToast = useCallback((kind: ToastData['kind'], txt: string, action?: ToastData['action']) => setToast({ id: Date.now(), kind, text: txt, action }), []);
  const { tasks, loading, storageOk, add, update, complete, restore, toggleStar, clearAll } = useTasks(
    { cloud: account.cloud, uid },
    (e) => e.kind === 'migrated'
      ? showToast('success', `ย้ายงาน ${e.count} รายการจากเครื่องนี้เข้าบัญชีแล้ว`)
      : showToast('error', 'ซิงก์ไม่สำเร็จ จะลองใหม่เมื่อกลับมาออนไลน์'),
  );
  const [now, setNow] = useState(() => new Date());
  const [view, setView] = useState<View>(viewFromHash);
  const [text, setText] = useState('');
  const [review, setReview] = useState<Review | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSettings, setAiSettings] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [starOnly, setStarOnly] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Gemini key follows the account: pull it on sign-in if this device has none, or push this device's key up.
  useEffect(() => {
    if (!account.cloud || !uid) return;
    const cloud = account.cloud;
    cloud.getCloudGeminiKey(uid).then((k) => {
      if (k && !getGeminiKey()) setGeminiKey(k);
      else if (!k && getGeminiKey()) void cloud.setCloudGeminiKey(uid, getGeminiKey());
    }).catch(() => {});
  }, [account.cloud, uid]);

  // Keep "today" fresh (crossing midnight changes every badge).
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);
  useEffect(() => { const f = () => setView(viewFromHash()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  useEffect(() => { if (!storageOk) showToast('error', 'บันทึกลงเครื่องไม่ได้ ข้อมูลอาจหายเมื่อปิดหน้า'); }, [storageOk]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!newId) return; const t = setTimeout(() => setNewId(null), 2200); return () => clearTimeout(t); }, [newId]);

  const go = (v: View) => { location.hash = v === 'memory' ? 'memory' : ''; setView(v); };
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
    if (starOnly) l = l.filter((t) => t.starred);
    return [...l].sort((a, b) => {
      // A just-added task stays on top for a moment so the user sees it, then sorts by urgency.
      if (a.id === newId) return -1; if (b.id === newId) return 1;
      if (!!a.starred !== !!b.starred) return a.starred ? -1 : 1; // starred (important) first
      const d = URGENCY_ORDER[urgencyOf(a.due, now).level] - URGENCY_ORDER[urgencyOf(b.due, now).level];
      return d || (a.due ?? '9').localeCompare(b.due ?? '9') || a.createdAt - b.createdAt;
    });
  }, [open, urgentOnly, day, starOnly, now, newId]);

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
        <span className="logo"><Mascot size={36} />Onion Memo</span>
        <button className={`nv ${view === 'home' ? 'on' : ''}`} aria-current={view === 'home' ? 'page' : undefined} onClick={() => go('home')}><IconHome />หน้าหลัก</button>
        <button className={`nv ${view === 'memory' ? 'on' : ''}`} aria-current={view === 'memory' ? 'page' : undefined} onClick={() => go('memory')}><IconBox />Memory Box</button>
        <button className="nv nv-account" onClick={() => setAccountOpen(true)} aria-label={account.user ? `บัญชี ${account.user.name}` : 'บัญชีและการตั้งค่า'}>
          {account.user?.photo ? <img className="avatar sm" src={account.user.photo} alt="" referrerPolicy="no-referrer" /> : <IconUser />}
          {account.user ? 'บัญชี' : 'เข้าสู่ระบบ'}
        </button>
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
                  <h2 id="list-h" className="h-sec">{day ? `งานวัน${formatThaiDate(fromISODate(day))}` : starOnly ? 'งานสำคัญ' : urgentOnly ? 'งานด่วน' : 'งานของฉัน'}</h2>
                  <span className="row">
                    <button className={`chip-btn ${starOnly ? 'on' : ''}`} aria-pressed={starOnly} onClick={() => setStarOnly((v) => !v)}>
                      <IconStar filled={starOnly} width={16} height={16} />สำคัญ {open.filter((t) => t.starred).length || ''}
                    </button>
                    {(day || urgentOnly || starOnly) ? <button className="link" onClick={() => { setDay(null); setUrgentOnly(false); setStarOnly(false); }}>ดูทั้งหมด</button> : <span className="t-xs">{open.length} งาน</span>}
                  </span>
                </div>
                {loading ? (
                  <p className="t-sm" role="status">กำลังโหลดงานจากบัญชี…</p>
                ) : !hasAny ? (
                  <EmptyState title="ยังไม่มีงานเลย" text="พิมพ์งานแรกในช่องด้านบน แล้วกด “ให้ AI ช่วยแยก”" />
                ) : list.length === 0 ? (
                  <EmptyState title={starOnly ? 'ยังไม่มีงานที่ติดดาว' : urgentOnly ? 'ไม่มีงานด่วน' : day ? 'วันนี้ว่าง ไม่มีงานส่ง' : 'เคลียร์งานหมดแล้ว'} text={starOnly ? 'แตะดาวที่การ์ดงานเพื่อทำเครื่องหมายว่าสำคัญ' : urgentOnly || day ? 'แตะ “ดูทั้งหมด” เพื่อกลับไปดูทุกงาน' : 'งานที่เสร็จอยู่ใน Memory Box'} />
                ) : (
                  <div className="list">
                    {list.map((t) => (
                      <TaskCard key={t.id} task={t} today={now} leaving={leaving === t.id} isNew={newId === t.id}
                        onOpen={() => setEditing(t)} onDone={() => markDone(t)} onStar={() => toggleStar(t.id)} />
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
      {aiSettings && <AiSettings onClose={() => setAiSettings(false)} onSaved={(m) => {
        showToast('success', m);
        if (account.cloud && uid) account.cloud.setCloudGeminiKey(uid, getGeminiKey()).catch(() => {});
      }} />}
      {accountOpen && (
        <AccountPanel enabled={account.enabled} user={account.user} taskCount={tasks.length}
          onSignIn={account.signIn}
          onSignOut={async () => { await account.signOut(); setAccountOpen(false); showToast('success', 'ออกจากระบบแล้ว'); }}
          onOpenAi={() => { setAccountOpen(false); setAiSettings(true); }}
          onClose={() => setAccountOpen(false)} />
      )}
      {confirmClear && (
        <ConfirmModal title="ล้างข้อมูลทั้งหมด?"
          body={`งานทั้งหมด ${tasks.length} รายการ (ค้างอยู่ ${open.length} · ใน Memory Box ${tasks.length - open.length}) จะหาย${uid ? 'จากบัญชีนี้ทุกเครื่อง' : 'จากเครื่องนี้'} และกู้คืนไม่ได้`}
          confirmLabel={`ล้าง ${tasks.length} รายการ`}
          onConfirm={() => { clearAll(); setConfirmClear(false); go('home'); showToast('success', 'ล้างข้อมูลแล้ว'); }}
          onCancel={() => setConfirmClear(false)} />
      )}
    </div>
  );
}
