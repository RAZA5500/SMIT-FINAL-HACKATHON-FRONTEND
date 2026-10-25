import { addDays, addMinutesToHhmm, diffDays, eachDay, endOfMonth, hhmmTo12h, hhmmToMinutes, minutesToHm, monthOf, startOfMonth, weekdayOf } from './dates';

describe('dates utility', () => {
  it('converts HH:mm to 12-hour format with AM/PM', () => {
    expect(hhmmTo12h('09:00')).toBe('9:00 AM');
    expect(hhmmTo12h('13:30')).toBe('1:30 PM');
    expect(hhmmTo12h('00:00')).toBe('12:00 AM');
    expect(hhmmTo12h('12:15')).toBe('12:15 PM');
  });

  it('converts HH:mm to minutes and adds minutes correctly', () => {
    expect(hhmmToMinutes('09:15')).toBe(555);
    expect(addMinutesToHhmm('09:00', 15)).toBe('09:15');
    expect(addMinutesToHhmm('09:45', 30)).toBe('10:15');
  });

  it('formats minutes into human readable hm strings', () => {
    expect(minutesToHm(480)).toBe('8h');
    expect(minutesToHm(510)).toBe('8h 30m');
    expect(minutesToHm(45)).toBe('45m');
    expect(minutesToHm(0)).toBe('0m');
  });

  it('correctly determines the weekday name for a date string', () => {
    // 2026-10-25 is a Sunday
    expect(weekdayOf('2026-10-25')).toBe('Sunday');
    // 2026-10-26 is a Monday
    expect(weekdayOf('2026-10-26')).toBe('Monday');
  });

  it('handles addDays and diffDays correctly across months and leap years', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29'); // Leap year
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(diffDays('2026-10-01', '2026-10-10')).toBe(9);
  });

  it('calculates startOfMonth and endOfMonth accurately', () => {
    expect(startOfMonth('2026-02-15')).toBe('2026-02-01');
    expect(endOfMonth('2026-02')).toBe('2026-02-28'); // Non-leap year
    expect(endOfMonth('2024-02')).toBe('2024-02-29'); // Leap year
    expect(monthOf('2026-10-25')).toBe('2026-10');
  });

  it('generates date ranges with eachDay', () => {
    const days = eachDay('2026-10-28', '2026-11-01');
    expect(days).toEqual(['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
  });
});
