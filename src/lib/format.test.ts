import { describe, expect, it } from '@jest/globals';

import { formatClock, formatDayTime, formatMinutes, parseClock, parseDate } from './format';

describe('formatClock / parseClock', () => {
  it('formats minutes and seconds', () => {
    expect(formatClock(75)).toBe('01:15');
    expect(formatClock(0)).toBe('00:00');
  });

  it('adds hours when needed', () => {
    expect(formatClock(3725)).toBe('1:02:05');
  });

  it('treats missing or negative values as zero', () => {
    expect(formatClock(null)).toBe('00:00');
    expect(formatClock(-4)).toBe('00:00');
  });

  it('parses mm:ss and h:mm:ss', () => {
    expect(parseClock('01:30')).toBe(90);
    expect(parseClock('1:02:05')).toBe(3725);
  });

  it('parses garbage as zero', () => {
    expect(parseClock('soon')).toBe(0);
    expect(parseClock(undefined)).toBe(0);
  });
});

describe('formatMinutes', () => {
  it('rounds to minutes and hours', () => {
    expect(formatMinutes(600)).toBe('10 min');
    expect(formatMinutes(5400)).toBe('1h 30m');
    expect(formatMinutes(7200)).toBe('2h');
  });

  it('returns null without a duration', () => {
    expect(formatMinutes(0)).toBeNull();
  });
});

describe('parseDate', () => {
  it('reads a date without a timezone as local time (API §4)', () => {
    const d = parseDate('2026-11-01T23:59:00');
    expect(d?.getHours()).toBe(23);
    expect(d?.getMinutes()).toBe(59);
  });

  it('returns null for bad input', () => {
    expect(parseDate('not a date')).toBeNull();
    expect(parseDate(null)).toBeNull();
  });
});

describe('formatDayTime', () => {
  const now = new Date(2026, 9, 14, 12, 0);
  it('says Today and Yesterday', () => {
    expect(formatDayTime(new Date(2026, 9, 14, 9, 5).toISOString(), now)).toMatch(/^Today, /);
    expect(formatDayTime(new Date(2026, 9, 13, 9, 5).toISOString(), now)).toMatch(/^Yesterday, /);
  });

  it('shows the date for older times', () => {
    expect(formatDayTime(new Date(2026, 8, 1, 9, 5).toISOString(), now)).not.toMatch(/Today|Yesterday/);
  });
});
