import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({ width: 20, height: 20, 'aria-hidden': true, focusable: false, ...p });

export const IconHome = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...base(p)}>
    <path d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2h-3v-6H9v6H6a2 2 0 0 1-2-2z" />
  </svg>
);
export const IconBox = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...base(p)}>
    <rect x="3" y="8" width="18" height="13" rx="3" /><path d="M3 8l2-4h14l2 4M10 12h4" />
  </svg>
);
export const IconSpark = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...base(p)}><path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z" /></svg>
);
export const IconCalendar = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" {...base(p)}>
    <rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);
export const IconExclaim = (p: P) => (
  <svg viewBox="0 0 16 16" fill="currentColor" {...base(p)}><rect x="6.8" y="2" width="2.4" height="8" rx="1.2" /><circle cx="8" cy="13" r="1.4" /></svg>
);
export const IconFlame = (p: P) => (
  <svg viewBox="0 0 16 16" fill="currentColor" {...base(p)}><path d="M8 1c1 3 4 4.5 4 8.5A4 4 0 0 1 4 9.5C4 7.5 5.5 6.5 6 5c.5 1.5 1.5 2 2 2C8.2 5 7.6 3 8 1z" /></svg>
);
export const IconClock = (p: P) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} {...base(p)}><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></svg>
);
export const IconLeaf = (p: P) => (
  <svg viewBox="0 0 16 16" fill="currentColor" {...base(p)}><path d="M13 2C6 2 3 6 3 10c0 1.5.5 2.6 1 3.3L3 15h1.5l.8-1.2C6 14.3 7 14.5 8 14.5c4 0 5-5 5-12.5z" /></svg>
);
export const IconDash = (p: P) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" {...base(p)}><path d="M4 8h8" /></svg>
);
export const IconWarn = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...base(p)}><path d="M12 3L2 21h20zM11 10h2v5h-2zm0 7h2v2h-2z" /></svg>
);
export const IconTrash = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" {...base(p)}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
);
export const IconX = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IconChevron = ({ dir = 'right', ...p }: P & { dir?: 'left' | 'right' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...base(p)}>
    <path d={dir === 'right' ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'} />
  </svg>
);
export const IconStar = ({ filled = false, ...p }: P & { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinejoin="round" {...base(p)}>
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </svg>
);
export const IconUser = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" {...base(p)}>
    <circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
);
