import { useId, useState } from 'react';
import { getGeminiKey, setGeminiKey, testGeminiKey } from '../lib/gemini';
import { IconSpark, IconWarn } from './Icons';
import { Modal } from './Modal';

/** Lets the user paste their own Gemini API key; it is stored only in this browser. */
export function AiSettings({ onClose, onSaved }: { onClose: () => void; onSaved: (msg: string) => void }) {
  const ids = { h: useId(), k: useId(), hint: useId() };
  const saved = getGeminiKey();
  const [key, setKey] = useState(saved);
  const [show, setShow] = useState(false);
  const [state, setState] = useState<'idle' | 'testing' | 'bad'>('idle');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const k = key.trim();
    if (!k) return;
    setState('testing');
    const ok = await testGeminiKey(k);
    if (!ok) { setState('bad'); return; }
    setGeminiKey(k);
    onSaved('บันทึก Gemini API key แล้ว · AI ช่วยแยกพร้อมใช้');
    onClose();
  };

  return (
    <Modal labelledBy={ids.h} onClose={onClose}>
      <form className="form" onSubmit={save} noValidate>
        <div className="form-head">
          <IconSpark width={28} height={28} className="ic-brand" />
          <div>
            <h2 id={ids.h} className="h-sec">ตั้งค่า AI ช่วยแยก</h2>
            <p className="t-xs">ใช้ Gemini อ่านใจความ หัวข้อ รายละเอียด และวันส่ง</p>
          </div>
        </div>
        <div className="field">
          <label htmlFor={ids.k}>Gemini API key</label>
          <div className="row">
            <input id={ids.k} className="inp grow" type={show ? 'text' : 'password'} autoComplete="off" spellCheck={false}
              value={key} onChange={(e) => { setKey(e.target.value); setState('idle'); }} aria-describedby={ids.hint}
              aria-invalid={state === 'bad'} placeholder="วาง key จาก Google AI Studio" data-autofocus />
            <button type="button" className="btn g sm" onClick={() => setShow((v) => !v)}>{show ? 'ซ่อน' : 'แสดง'}</button>
          </div>
          {state === 'bad' && <span className="hint warn"><IconWarn width={16} height={16} />key นี้ใช้ไม่ได้ ตรวจว่าคัดลอกครบ หรือสร้าง key ใหม่</span>}
          <p id={ids.hint} className="t-xs">
            key เก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น ไม่ถูกส่งไปที่อื่นนอกจาก Google
            ถ้าใช้หลายเครื่อง ต้องใส่ทีละเครื่อง สร้าง key ได้ที่{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>
          </p>
        </div>
        <div className="acts">
          {saved && (
            <button type="button" className="btn g sm danger" onClick={() => { setGeminiKey(''); onSaved('ลบ key แล้ว · ใช้ตัวแยกในเครื่องแทน'); onClose(); }}>
              ลบ key
            </button>
          )}
          <span className="grow" />
          <button type="button" className="btn g sm" onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="btn p" disabled={!key.trim() || state === 'testing'}>
            {state === 'testing' ? 'กำลังตรวจ…' : 'บันทึก'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
