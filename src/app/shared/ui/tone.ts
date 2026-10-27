export type Tone = 'emerald' | 'teal' | 'amber' | 'violet' | 'navy' | 'blue' | 'rose' | 'slate' | 'orange';

/** Small status dot per tone. */
export const TONE_DOT: Record<Tone, string> = {
  emerald: 'bg-green-500', // status dot: present/approved stay green
  teal: 'bg-indigo-500',
  amber: 'bg-amber-500',
  violet: 'bg-violet-500',
  navy: 'bg-slate-400',
  blue: 'bg-blue-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
  orange: 'bg-orange-500',
};

/** Tinted icon chip (dialog headers, list icons). */
export const TONE_CHIP: Record<Tone, string> = {
  emerald: 'bg-blue-50 text-blue-600 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/25',
  teal: 'bg-indigo-50 text-indigo-600 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/25',
  amber: 'bg-amber-50 text-amber-600 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25',
  violet: 'bg-violet-50 text-violet-600 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/25',
  navy: 'bg-slate-900 text-white ring-slate-900 shadow-[0_6px_14px_-6px_rgb(15_16_20/0.5)] dark:bg-white dark:text-slate-900 dark:ring-white',
  blue: 'bg-blue-50 text-blue-600 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/25',
  rose: 'bg-rose-50 text-rose-600 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/25',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  orange: 'bg-orange-50 text-orange-600 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/25',
};

/** Soft glow behind a stat tile, revealed on hover. */
export const TONE_GLOW: Record<Tone, string> = {
  emerald: 'bg-blue-400/25',
  teal: 'bg-indigo-400/25',
  amber: 'bg-amber-400/25',
  violet: 'bg-violet-400/25',
  navy: 'bg-slate-400/25',
  blue: 'bg-blue-400/25',
  rose: 'bg-rose-400/25',
  slate: 'bg-slate-400/25',
  orange: 'bg-orange-400/25',
};
