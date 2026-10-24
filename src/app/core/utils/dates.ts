import { WeekDay } from '../models/api.models';

/**
 * Calendar days travel through the API as `YYYY-MM-DD` strings in the company timezone.
 * These helpers never pass such strings through UTC parsing, so a date never shifts by a day.
 */

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS: WeekDay[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as unknown as WeekDay[];

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `YYYY-MM-DD` → local midnight Date. */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Today's calendar date in the given IANA timezone (defaults to the browser's). */
export function todayIn(timeZone?: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return toIsoDate(new Date());
  }
}

/** Minutes since midnight right now in the given timezone. */
export function minutesNowIn(timeZone?: string, now = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return h * 60 + m;
  } catch {
    return now.getHours() * 60 + now.getMinutes();
  }
}

/** Current local time `HH:mm` in the given timezone. */
export function hhmmNowIn(timeZone?: string): string {
  const minutes = minutesNowIn(timeZone);
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function diffDays(from: string, to: string): number {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000);
}

export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonth(isoOrMonth: string): string {
  const [y, m] = isoOrMonth.slice(0, 7).split('-').map(Number);
  return toIsoDate(new Date(y, m, 0));
}

export function startOfYear(iso: string): string {
  return `${iso.slice(0, 4)}-01-01`;
}

/** `YYYY-MM` shifted by n months. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y, m - 1 + n, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  if (!from || !to || to < from) return days;
  for (let d = from; d <= to && days.length < 800; d = addDays(d, 1)) days.push(d);
  return days;
}

export function weekdayOf(iso: string): WeekDay {
  return WEEKDAYS[parseIsoDate(iso).getDay()];
}

export function formatDate(iso: string | null | undefined, style: 'short' | 'medium' | 'long' | 'weekday' = 'medium'): string {
  if (!iso) return '—';
  const date = parseIsoDate(iso);
  const options: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { day: 'numeric', month: 'short' }
      : style === 'long'
        ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
        : style === 'weekday'
          ? { weekday: 'short', day: 'numeric', month: 'short' }
          : { day: 'numeric', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat('en-GB', options).format(date);
}

/** `YYYY-MM` → "October 2026". */
export function formatMonth(month: string | null | undefined, short = false): string {
  if (!month) return '—';
  const [y, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { month: short ? 'short' : 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
}

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

function cachedFormatter(kind: 'time' | 'stamp', timeZone?: string): Intl.DateTimeFormat {
  const key = `${kind}|${timeZone ?? ''}`;
  let formatter = timeFormatters.get(key);
  if (!formatter) {
    const options: Intl.DateTimeFormatOptions =
      kind === 'time'
        ? { hour: '2-digit', minute: '2-digit' }
        : { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    try {
      formatter = new Intl.DateTimeFormat(kind === 'time' ? 'en-US' : 'en-GB', { ...options, timeZone });
    } catch {
      formatter = new Intl.DateTimeFormat(kind === 'time' ? 'en-US' : 'en-GB', options);
    }
    timeFormatters.set(key, formatter);
  }
  return formatter;
}

/** A server-stamped instant shown in the company timezone, e.g. "09:07 AM". */
export function formatTime(instant: string | Date | null | undefined, timeZone?: string): string {
  if (!instant) return '—';
  return cachedFormatter('time', timeZone).format(new Date(instant));
}

export function formatDateTime(instant: string | Date | null | undefined, timeZone?: string): string {
  if (!instant) return '—';
  return cachedFormatter('stamp', timeZone).format(new Date(instant));
}

/** "just now", "5m ago", "3h ago", "2d ago", then a date. */
export function relativeTime(instant: string | Date | null | undefined, now = Date.now()): string {
  if (!instant) return '';
  const seconds = Math.round((now - new Date(instant).getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(instant));
}

/** 452 → "7h 32m". */
export function minutesToHm(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '—';
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "09:15" → "9:15 AM". */
export function hhmmTo12h(hhmm: string | null | undefined): string {
  if (!hhmm) return '—';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${pad(m)} ${suffix}`;
}

/** "09:00" + 15 → "09:15". */
export function addMinutesToHhmm(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (h * 60 + m + minutes + 24 * 60) % (24 * 60);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Whole months between two ISO dates. */
export function monthsBetween(from: string, to: string): number {
  const a = parseIsoDate(from);
  const b = parseIsoDate(to);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  return Math.max(0, months);
}

/** "2y 3m" style tenure label. */
export function tenureLabel(joinDate: string, today: string): string {
  const months = monthsBetween(joinDate, today);
  if (months < 1) return `${Math.max(0, diffDays(joinDate, today))}d`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest}m`;
  return rest ? `${years}y ${rest}m` : `${years}y`;
}

/** Common IANA timezones for the setup wizard (the browser's own zone is added at runtime). */
export const COMMON_TIMEZONES = [
  'Asia/Karachi',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Istanbul',
  'Africa/Cairo',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
  'UTC',
];
