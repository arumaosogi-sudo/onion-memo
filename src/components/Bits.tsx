import type { Urgency } from '../lib/date';
import { IconClock, IconDash, IconExclaim, IconFlame, IconLeaf } from './Icons';

export function Mascot({ size = 52, mood = 'happy' }: { size?: number; mood?: 'happy' | 'calm' }) {
  return (
    // Same drawing as public/favicon.svg (the app logo).
    <svg className="mascot" width={size} height={size * 60 / 58} viewBox="3 3 58 60" aria-hidden="true">
      <path d="M31 17c-1-6 1-10 6-12 1 5-1 10-6 12z" fill="#3FB56C" />
      <path d="M31 17c0-5-3-9-8-10 0 5 3 9 8 10z" fill="#2E9E5B" />
      <ellipse cx="32" cy="38" rx="27" ry="23" fill="#FFFFFF" stroke="#CFC4EE" strokeWidth="2" />
      <ellipse cx="23" cy="35" rx="3.2" ry="4.2" fill="#2D2A32" />
      <ellipse cx="41" cy="35" rx="3.2" ry="4.2" fill="#2D2A32" />
      <ellipse cx="15" cy="43" rx="5" ry="3" fill="#FFB3BA" />
      <ellipse cx="49" cy="43" rx="5" ry="3" fill="#FFB3BA" />
      {mood === 'happy'
        ? <path d="M28 42q4 4 8 0" stroke="#2D2A32" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        : <path d="M29 43h6" stroke="#2D2A32" strokeWidth="2.4" strokeLinecap="round" />}
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
