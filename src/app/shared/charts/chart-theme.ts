import type { ChartOptions, ChartType, Plugin, ScriptableContext, TooltipItem } from 'chart.js';

/**
 * Chart styling for HCM Lite (dataviz method): thin bars (≤24px, 4px rounded data-end,
 * square at the baseline), 2px lines with ringed ≥8px markers, recessive solid hairline
 * grids, a band-wide hover target, value-first tooltips, and one axis per chart.
 */

export interface ChartPalette {
  surface: string;
  ink: string;
  muted: string;
  grid: string;
  tooltipBg: string;
  tooltipInk: string;
}

export function chartPalette(dark: boolean): ChartPalette {
  return dark
    ? { surface: '#0f172a', ink: '#f1f5f9', muted: '#94a3b8', grid: '#1e293b', tooltipBg: '#f8fafc', tooltipInk: '#0f172a' }
    : { surface: '#ffffff', ink: '#0f172a', muted: '#64748b', grid: '#e2e8f0', tooltipBg: '#0f172a', tooltipInk: '#f8fafc' };
}

/** Single-hue series colours per mode (each validated for ≥3:1 on its surface, except brief amber which ships with labels + table view). */
export const SERIES = {
  teal: { light: '#0d9488', dark: '#14b8a6' },
  emerald: { light: '#059669', dark: '#34d399' },
  amber: { light: '#F59E0B', dark: '#F59E0B' },
  amberBar: { light: '#d97706', dark: '#fbbf24' },
  rose: { light: '#f43f5e', dark: '#fb7185' },
  blue: { light: '#3b82f6', dark: '#60a5fa' },
} as const;

export type SeriesName = keyof typeof SERIES;

export function seriesColor(name: SeriesName, dark: boolean): string {
  return dark ? SERIES[name].dark : SERIES[name].light;
}

/** Ordinal teal ramp for tenure bands (validated: monotone L, ΔL ≥ 0.06, light end ≥ 2:1). */
export const TENURE_RAMP = {
  light: ['#14b8a6', '#0d9488', '#0f766e', '#115e59', '#042f2e'],
  dark: ['#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#99f6e4'],
};

export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Scriptable gradient along the value axis (base → tip). */
export function gradientFill<T extends ChartType>(hex: string, fromAlpha: number, toAlpha: number, horizontal = false) {
  return (ctx: ScriptableContext<T>): string | CanvasGradient => {
    const { chart } = ctx;
    const area = chart.chartArea;
    if (!area) return alpha(hex, toAlpha);
    const gradient = horizontal
      ? chart.ctx.createLinearGradient(area.left, 0, area.right, 0)
      : chart.ctx.createLinearGradient(0, area.bottom, 0, area.top);
    gradient.addColorStop(0, alpha(hex, fromAlpha));
    gradient.addColorStop(1, alpha(hex, toAlpha));
    return gradient;
  };
}

const FONT = { family: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" };

function tooltipBase(p: ChartPalette) {
  return {
    backgroundColor: p.tooltipBg,
    titleColor: alpha(p.tooltipInk === '#0f172a' ? '#334155' : '#cbd5e1', 1),
    bodyColor: p.tooltipInk,
    footerColor: alpha(p.tooltipInk === '#0f172a' ? '#475569' : '#94a3b8', 1),
    titleFont: { ...FONT, size: 11, weight: 500 as const },
    bodyFont: { ...FONT, size: 13, weight: 700 as const },
    footerFont: { ...FONT, size: 11, weight: 500 as const },
    padding: 10,
    cornerRadius: 10,
    caretSize: 5,
    boxPadding: 4,
    usePointStyle: true,
    displayColors: true,
  };
}

export interface BarChartConfig {
  horizontal?: boolean;
  format: (value: number) => string;
  axisFormat?: (value: number) => string;
  footer?: (index: number) => string[];
  max?: number;
}

export function barOptions(p: ChartPalette, cfg: BarChartConfig): ChartOptions<'bar'> {
  const valueAxis = {
    beginAtZero: true,
    max: cfg.max,
    grid: { color: p.grid, lineWidth: 1, drawTicks: false },
    border: { display: false },
    ticks: { color: p.muted, font: { ...FONT, size: 11 }, padding: 8, maxTicksLimit: 6, callback: (v: string | number) => (cfg.axisFormat ?? cfg.format)(Number(v)) },
  };
  const categoryAxis = {
    grid: { display: false },
    border: { color: p.grid },
    ticks: { color: p.muted, font: { ...FONT, size: 11 }, padding: 6, autoSkip: true, maxRotation: 0 },
  };
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: cfg.horizontal ? 'y' : 'x',
    animation: { duration: 700, easing: 'easeOutQuart' },
    layout: { padding: { top: cfg.horizontal ? 0 : 18, right: cfg.horizontal ? 48 : 4 } },
    interaction: { mode: 'index', intersect: false, axis: cfg.horizontal ? 'y' : 'x' },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipBase(p),
        callbacks: {
          label: (item: TooltipItem<'bar'>) => ` ${cfg.format(Number(item.raw))}`,
          labelPointStyle: () => ({ pointStyle: 'line', rotation: 0 }),
          footer: (items: TooltipItem<'bar'>[]) => (cfg.footer && items[0] ? cfg.footer(items[0].dataIndex) : []),
        },
      },
    },
    scales: cfg.horizontal ? { x: valueAxis, y: categoryAxis } : { x: categoryAxis, y: valueAxis },
  };
}

export interface LineChartConfig {
  format: (value: number) => string;
  axisFormat?: (value: number) => string;
  footer?: (index: number) => string[];
  max?: number;
}

export function lineOptions(p: ChartPalette, cfg: LineChartConfig): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' },
    layout: { padding: { top: 12, right: 44 } },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipBase(p),
        callbacks: {
          label: (item: TooltipItem<'line'>) => ` ${cfg.format(Number(item.raw))}`,
          labelPointStyle: () => ({ pointStyle: 'line', rotation: 0 }),
          footer: (items: TooltipItem<'line'>[]) => (cfg.footer && items[0] ? cfg.footer(items[0].dataIndex) : []),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: p.grid },
        ticks: { color: p.muted, font: { ...FONT, size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
      },
      y: {
        beginAtZero: true,
        max: cfg.max,
        grid: { color: p.grid, lineWidth: 1, drawTicks: false },
        border: { display: false },
        ticks: { color: p.muted, font: { ...FONT, size: 11 }, padding: 8, maxTicksLimit: 6, callback: (v) => (cfg.axisFormat ?? cfg.format)(Number(v)) },
      },
    },
  };
}

/** Vertical hairline that snaps to the hovered X (line charts). */
export function crosshairPlugin(color: string): Plugin<'line'> {
  return {
    id: 'hcmCrosshair',
    afterDatasetsDraw(chart) {
      const active = chart.tooltip?.getActiveElements();
      if (!active?.length) return;
      const x = active[0].element.x;
      const { top, bottom } = chart.chartArea;
      const ctx = chart.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    },
  };
}

/** Value at each bar tip, in text ink (never the series colour). */
export function barValueLabels(format: (value: number) => string, color: string, horizontal = false): Plugin<'bar'> {
  return {
    id: 'hcmBarLabels',
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;
      ctx.save();
      ctx.font = `600 11px ${FONT.family}`;
      ctx.fillStyle = color;
      chart.data.datasets.forEach((dataset, di) => {
        const meta = chart.getDatasetMeta(di);
        if (meta.hidden) return;
        meta.data.forEach((bar, i) => {
          const value = Number(dataset.data[i]);
          if (!Number.isFinite(value)) return;
          const text = format(value);
          const { x, y } = bar.getProps(['x', 'y'], true) as { x: number; y: number };
          if (horizontal) {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x + 6, y);
          } else {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(text, x, y - 5);
          }
        });
      });
      ctx.restore();
    },
  };
}

/** Labels the last point of a line (direct end label). */
export function lineEndLabel(format: (value: number) => string, color: string): Plugin<'line'> {
  return {
    id: 'hcmLineEnd',
    afterDatasetsDraw(chart) {
      const meta = chart.getDatasetMeta(0);
      const data = chart.data.datasets[0]?.data ?? [];
      if (!meta || meta.hidden || data.length === 0) return;
      const last = meta.data[meta.data.length - 1];
      const value = Number(data[data.length - 1]);
      if (!last || !Number.isFinite(value)) return;
      const ctx = chart.ctx;
      ctx.save();
      ctx.font = `700 11px ${FONT.family}`;
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(format(value), last.x + 8, last.y);
      ctx.restore();
    },
  };
}
