const moneyFormatters = new Map<string, Intl.NumberFormat>();

/** Currency amount, e.g. "PKR 150,000". */
export function formatMoney(value: number | null | undefined, currency = 'PKR', compact = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const key = `${currency}|${compact}`;
  try {
    let formatter = moneyFormatters.get(key);
    if (!formatter) {
      formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        currencyDisplay: 'code',
        notation: compact ? 'compact' : 'standard',
        maximumFractionDigits: compact ? 1 : 0,
      });
      moneyFormatters.set(key, formatter);
    }
    return formatter.format(value).replace(/ /g, ' ');
  } catch {
    return `${currency} ${formatNumber(value)}`;
  }
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
}

/** 12900 → "12.9K". */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/** Percent values arrive from the API already ×100 (e.g. 92.31). */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${formatNumber(value, digits)}%`;
}

/** Rates arrive as fractions (0.4) → "40%". */
export function formatRate(rate: number): string {
  return `${formatNumber(rate * 100, 1)}%`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** Stable gradient for an avatar, picked from the name. */
export function avatarGradient(seed: string | null | undefined): string {
  const gradients = [
    'from-emerald-400 to-teal-600',
    'from-amber-300 to-orange-500',
    'from-sky-400 to-blue-600',
    'from-rose-400 to-pink-600',
    'from-teal-300 to-cyan-600',
    'from-lime-400 to-emerald-600',
    'from-orange-300 to-rose-500',
    'from-slate-500 to-slate-800',
  ];
  let hash = 0;
  for (const ch of seed ?? '') hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return gradients[hash % gradients.length];
}

export function titleCase(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Triggers a browser download for a Blob. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Reads `filename="…"` out of a Content-Disposition header. */
export function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1]) : fallback;
}

/** Builds a CSV string (RFC 4180 quoting). */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const quote = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return rows.map((row) => row.map(quote).join(',')).join('\r\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
