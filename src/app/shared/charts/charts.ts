import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { ChartData, Plugin } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ThemeService } from '../../core/services/theme.service';
import {
  SeriesName,
  barOptions,
  barValueLabels,
  chartPalette,
  crosshairPlugin,
  gradientFill,
  lineEndLabel,
  lineOptions,
  seriesColor,
} from './chart-theme';

const defaultFormat = (n: number) => n.toLocaleString('en-US');

/**
 * Single-series bar chart (one hue, no legend — the card title names the series).
 * Chart.js is registered here so it only ships in the lazy chunks that render charts.
 */
@Component({
  selector: 'app-bar-chart',
  imports: [BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (key of [renderKey()]; track key) {
      <canvas baseChart type="bar" [data]="data()" [options]="options()" [plugins]="plugins()" [legend]="false" role="img" [attr.aria-label]="ariaLabel()"></canvas>
    }
  `,
  host: { class: 'block h-full w-full' },
})
export class BarChartComponent {
  private readonly theme = inject(ThemeService);

  readonly labels = input<string[]>([]);
  readonly values = input<number[]>([]);
  readonly series = input<SeriesName>('ink');
  /** Per-bar colours (ordinal ramps); overrides `series`. */
  readonly colors = input<string[] | null>(null);
  readonly horizontal = input(false);
  readonly format = input<(value: number) => string>(defaultFormat);
  readonly axisFormat = input<((value: number) => string) | undefined>(undefined);
  readonly footer = input<((index: number) => string[]) | undefined>(undefined);
  readonly max = input<number | undefined>(undefined);
  readonly valueLabels = input(true);
  readonly ariaLabel = input('Bar chart');

  protected readonly renderKey = computed(() => (this.theme.isDark() ? 'dark' : 'light'));

  protected readonly data = computed<ChartData<'bar'>>(() => {
    const dark = this.theme.isDark();
    const color = seriesColor(this.series(), dark);
    const colors = this.colors();
    return {
      labels: this.labels(),
      datasets: [
        {
          data: this.values(),
          backgroundColor: colors ?? gradientFill<'bar'>(color, 0.55, 1, this.horizontal()),
          hoverBackgroundColor: colors ?? color,
          borderRadius: 6,
          borderSkipped: 'start',
          maxBarThickness: 24,
          categoryPercentage: 0.72,
          barPercentage: 0.92,
        },
      ],
    };
  });

  protected readonly options = computed(() =>
    barOptions(chartPalette(this.theme.isDark()), {
      horizontal: this.horizontal(),
      format: this.format(),
      axisFormat: this.axisFormat(),
      footer: this.footer(),
      max: this.max(),
    }),
  );

  protected readonly plugins = computed<Plugin<'bar'>[]>(() =>
    this.valueLabels() ? [barValueLabels(this.format(), chartPalette(this.theme.isDark()).muted, this.horizontal())] : [],
  );
}

/** Single-series trend line with a faint area wash, ringed markers and a snapping crosshair. */
@Component({
  selector: 'app-line-chart',
  imports: [BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (key of [renderKey()]; track key) {
      <canvas baseChart type="line" [data]="data()" [options]="options()" [plugins]="plugins()" [legend]="false" role="img" [attr.aria-label]="ariaLabel()"></canvas>
    }
  `,
  host: { class: 'block h-full w-full' },
})
export class LineChartComponent {
  private readonly theme = inject(ThemeService);

  readonly labels = input<string[]>([]);
  readonly values = input<number[]>([]);
  readonly series = input<SeriesName>('emerald');
  readonly format = input<(value: number) => string>(defaultFormat);
  readonly axisFormat = input<((value: number) => string) | undefined>(undefined);
  readonly footer = input<((index: number) => string[]) | undefined>(undefined);
  readonly max = input<number | undefined>(undefined);
  readonly ariaLabel = input('Line chart');

  protected readonly renderKey = computed(() => (this.theme.isDark() ? 'dark' : 'light'));

  protected readonly data = computed<ChartData<'line'>>(() => {
    const dark = this.theme.isDark();
    const color = seriesColor(this.series(), dark);
    const palette = chartPalette(dark);
    const dense = this.values().length > 31;
    return {
      labels: this.labels(),
      datasets: [
        {
          data: this.values(),
          borderColor: color,
          borderWidth: 2,
          borderCapStyle: 'round',
          borderJoinStyle: 'round',
          tension: 0.3,
          fill: true,
          backgroundColor: gradientFill<'line'>(color, 0, 0.12),
          pointRadius: dense ? 0 : 3,
          pointHoverRadius: 5,
          pointBackgroundColor: color,
          pointBorderColor: palette.surface,
          pointBorderWidth: 2,
          pointHitRadius: 14,
        },
      ],
    };
  });

  protected readonly options = computed(() =>
    lineOptions(chartPalette(this.theme.isDark()), {
      format: this.format(),
      axisFormat: this.axisFormat(),
      footer: this.footer(),
      max: this.max(),
    }),
  );

  protected readonly plugins = computed<Plugin<'line'>[]>(() => {
    const palette = chartPalette(this.theme.isDark());
    return [crosshairPlugin(palette.muted), lineEndLabel(this.format(), palette.ink)];
  });
}
