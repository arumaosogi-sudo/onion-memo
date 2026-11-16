import type { Urgency } from '../lib/date';
import { IconClock, IconDash, IconExclaim, IconFlame, IconLeaf } from './Icons';

export function Mascot({ size = 52, mood = 'happy' }: { size?: number; mood?: 'happy' | 'calm' }) {
  return (
    <svg className="mascot" width={size} height={size * 0.9} viewBox="0 0 52 47" aria-hidden="true">
      <rect x="22" y="0" width="8" height="12" rx="4" fill="var(--ok-ink)" transform="rotate(-15 26 6)" />
      <ellipse cx="26" cy="27" rx="24" ry="19" fill="var(--mascot-body)" stroke="var(--mascot-line)" strokeWidth="1.5" />
      <ellipse cx="18" cy="25" rx="3" ry="4" fill="var(--mascot-eye)" />
      <ellipse cx="34" cy="25" rx="3" ry="4" fill="var(--mascot-eye)" />
      <ellipse cx="11" cy="32" rx="4.5" ry="2.5" fill="#FFB3BA" />
      <ellipse cx="41" cy="32" rx="4.5" ry="2.5" fill="#FFB3BA" />
      {mood === 'happy'
        ? <path d="M22 32q4 4 8 0" stroke="var(--mascot-eye)" strokeWidth="2" fill="none" strokeLinecap="round" />
        : <path d="M23 33h6" stroke="var(--mascot-eye)" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

const BADGE_ICON: Record<Urgency, typeof IconFlame> = {
  overdue: IconExclaim, today: IconFlame, urgent: IconFlame, soon: IconClock, ok: IconLeaf, none: IconDash,
};

export function StatusBadge({ level, label }: { level: Urgency; label: string }) {
  const Icon = BADGE_ICON[level];
  return (
    <span className={`badge b-${level}`}>
      <Icon width={13} height={13} />
      {label}
    </span>
  );
}

/** Calendar marker: shape differs per level so it works without color. */
export function Marker({ level }: { level: Urgency }) {
  if (level === 'none') return null;
  return <i className={`mk mk-${level}`} aria-hidden="true" />;
}
