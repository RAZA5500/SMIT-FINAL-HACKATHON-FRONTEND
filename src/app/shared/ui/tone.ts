export type Tone = 'emerald' | 'teal' | 'amber' | 'violet' | 'navy' | 'blue' | 'rose' | 'slate' | 'orange';

/** Icon chip colours per tone. */
export const TONE_CHIP: Record<Tone, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400',
  teal: 'bg-teal-500/10 text-teal-600 ring-teal-500/20 dark:text-teal-400',
  amber: 'bg-amber-500/10 text-amber-600 ring-amber-500/25 dark:text-amber-400',
  violet: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400',
  navy: 'bg-slate-900/[0.06] text-slate-800 ring-slate-900/10 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10',
  blue: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400',
  rose: 'bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400',
  slate: 'bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300',
  orange: 'bg-orange-500/10 text-orange-600 ring-orange-500/20 dark:text-orange-400',
};

/** Soft corner glow per tone (decorative). */
export const TONE_GLOW: Record<Tone, string> = {
  emerald: 'bg-emerald-400/25',
  teal: 'bg-teal-400/25',
  amber: 'bg-amber-400/25',
  violet: 'bg-violet-500/25',
  navy: 'bg-slate-500/20',
  blue: 'bg-blue-400/25',
  rose: 'bg-rose-400/25',
  slate: 'bg-slate-400/20',
  orange: 'bg-orange-400/25',
};

/** Solid gradient (hero icons, avatars of features). */
export const TONE_SOLID: Record<Tone, string> = {
  emerald: 'from-emerald-400 to-teal-600 shadow-emerald-500/30',
  teal: 'from-teal-400 to-teal-700 shadow-teal-500/30',
  amber: 'from-amber-300 to-amber-500 shadow-amber-500/30',
  violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
  navy: 'from-slate-700 to-slate-900 shadow-slate-900/30',
  blue: 'from-sky-400 to-blue-600 shadow-blue-500/30',
  rose: 'from-rose-400 to-rose-600 shadow-rose-500/30',
  slate: 'from-slate-400 to-slate-600 shadow-slate-500/30',
  orange: 'from-orange-300 to-orange-500 shadow-orange-500/30',
};
