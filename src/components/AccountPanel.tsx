import { useEffect, useId, useState } from 'react';
import { prefetchCloud } from '../lib/account';
import type { CloudUser } from '../lib/cloud';
import { getGeminiKey } from '../lib/gemini';
import { Mascot } from './Bits';
import { IconSpark, IconWarn } from './Icons';
import { Modal } from './Modal';

/** Account (Google sign-in + sync) and app settings in one sheet. */
export function AccountPanel({ enabled, user, taskCount, onSignIn, onSignOut, onOpenAi, onClose }: {
  enabled: boolean; user: CloudUser | null; taskCount: number;
  onSignIn: () => Promise<void>; onSignOut: () => Promise<void>; onOpenAi: () => void; onClose: () => void;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hasKey = !!getGeminiKey();
  useEffect(() => { if (enabled && !user) prefetchCloud(); }, [enabled, user]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      setError(code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'
        ? 'ยกเลิกการเข้าสู่ระบบ'
        : code === 'auth/popup-blocked' ? 'เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ แตะปุ่มอีกครั้ง หรืออนุญาตป๊อปอัปสำหรับเว็บนี้'
        : code === 'auth/network-request-failed' ? 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้ง'
        : code === 'auth/unauthorized-domain' ? 'โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase' : `เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง${code ? ` (${code})` : ''}`);
    } finally { setBusy(false); }
  };

  return (
    <Modal labelledBy={id} onClose={onClose}>
      <div className="form">
        <div className="form-head">
          {user?.photo ? <img className="avatar" src={user.photo} alt="" referrerPolicy="no-referrer" /> : <Mascot size={44} />}
          <div className="grow">
            <h2 id={id} className="h-sec">{user ? user.name : 'บัญชีของฉัน'}</h2>
            <p className="t-xs">{user ? user.email : 'ยังไม่ได้เข้าสู่ระบบ · ข้อมูลอยู่ในเครื่องนี้เท่านั้น'}</p>
          </div>
        </div>

        {!enabled ? (
          <p className="quote">ระบบบัญชียังไม่เปิดใช้งาน ตอนนี้งานถูกเก็บไว้ในเครื่องนี้</p>
        ) : user ? (
          <div className="sync-ok">
            <p className="t-body">✓ ซิงก์อยู่ · งานของคุณ {taskCount} รายการเก็บในบัญชีนี้</p>
            <p className="t-xs">เข้าสู่ระบบด้วยบัญชีเดียวกันบนเครื่องอื่น ข้อมูลจะตามไปทันที ใช้งานออฟไลน์ได้และจะซิงก์เมื่อกลับมาออนไลน์</p>
          </div>
        ) : (
          <div className="col" style={{ gap: 10 }}>
            <p className="t-body">เข้าสู่ระบบเพื่อใช้ข้อมูลชุดเดียวกันทุกเครื่อง</p>
            <p className="t-xs">ครั้งแรกที่เข้าสู่ระบบ งานที่อยู่ในเครื่องนี้ ({taskCount} รายการ) จะถูกย้ายเข้าบัญชีให้</p>
            <button className="btn google" disabled={busy} onClick={() => run(onSignIn)}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
              {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบด้วย Google'}
            </button>
          </div>
        )}
        {error && <span className="hint warn"><IconWarn width={16} height={16} />{error}</span>}

        <button className="setting-row" onClick={onOpenAi}>
          <IconSpark width={20} height={20} className="ic-brand" />
          <span className="grow">ตั้งค่า AI (Gemini)</span>
          <span className="t-xs">{hasKey ? 'ใส่ key แล้ว' : 'ยังไม่ได้ใส่ key'}</span>
        </button>

        <div className="acts">
          {user && <button className="btn g sm danger" disabled={busy} onClick={() => run(onSignOut)}>ออกจากระบบ</button>}
          <span className="grow" />
          <button className="btn s sm" onClick={onClose}>ปิด</button>
        </div>
      </div>
    </Modal>
  );
}
