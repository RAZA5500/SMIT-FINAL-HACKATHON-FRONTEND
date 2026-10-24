import { Pipe, PipeTransform, inject } from '@angular/core';
import { PolicyStore } from '../../core/services/policy.store';
import { formatDate, formatDateTime, formatMonth, formatTime, hhmmTo12h, minutesToHm, relativeTime } from '../../core/utils/dates';
import { formatMoney, formatNumber, formatPercent, titleCase } from '../../core/utils/format';

/** `{{ amount | money }}` → "PKR 150,000" (company currency unless given). */
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly policies = inject(PolicyStore);

  transform(value: number | null | undefined, currency?: string, compact = false): string {
    return formatMoney(value, currency || this.policies.currency(), compact);
  }
}

@Pipe({ name: 'num' })
export class NumPipe implements PipeTransform {
  transform(value: number | null | undefined, digits = 0): string {
    return formatNumber(value, digits);
  }
}

@Pipe({ name: 'pct' })
export class PercentPipe implements PipeTransform {
  transform(value: number | null | undefined, digits = 1): string {
    return formatPercent(value, digits);
  }
}

/** `YYYY-MM-DD` → "26 Oct 2026" (no timezone shifting). */
@Pipe({ name: 'day' })
export class DayPipe implements PipeTransform {
  transform(value: string | null | undefined, style: 'short' | 'medium' | 'long' | 'weekday' = 'medium'): string {
    return formatDate(value, style);
  }
}

/** `YYYY-MM` → "October 2026". */
@Pipe({ name: 'month' })
export class MonthPipe implements PipeTransform {
  transform(value: string | null | undefined, short = false): string {
    return formatMonth(value, short);
  }
}

/** Server instant → time in the company timezone. */
@Pipe({ name: 'clock', pure: false })
export class ClockPipe implements PipeTransform {
  private readonly policies = inject(PolicyStore);

  transform(value: string | Date | null | undefined): string {
    return formatTime(value, this.policies.timezone());
  }
}

@Pipe({ name: 'stamp', pure: false })
export class StampPipe implements PipeTransform {
  private readonly policies = inject(PolicyStore);

  transform(value: string | Date | null | undefined): string {
    return formatDateTime(value, this.policies.timezone());
  }
}

@Pipe({ name: 'ago', pure: false })
export class AgoPipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return relativeTime(value);
  }
}

@Pipe({ name: 'hm' })
export class HoursMinutesPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return minutesToHm(value);
  }
}

/** "09:15" → "9:15 AM". */
@Pipe({ name: 'time12' })
export class Time12Pipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return hhmmTo12h(value);
  }
}

@Pipe({ name: 'title' })
export class TitleCasePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return titleCase(value);
  }
}

export const FORMAT_PIPES = [
  MoneyPipe,
  NumPipe,
  PercentPipe,
  DayPipe,
  MonthPipe,
  ClockPipe,
  StampPipe,
  AgoPipe,
  HoursMinutesPipe,
  Time12Pipe,
  TitleCasePipe,
] as const;
