/**
 * Small formatting helpers shared by the learn screens (S12–S17).
 * Pure functions, no React.
 */

/** 75 → "01:15", 3725 → "1:02:05". Negative or missing → "00:00". */
export function formatClock(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(seconds ?? 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "mm:ss" or "h:mm:ss" → seconds. Anything unparseable → 0. */
export function parseClock(value: string | null | undefined): number {
  if (!value) return 0;
  const parts = value.trim().split(':').map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return 0;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

/** 600 → "10 min", 5400 → "1h 30m". */
export function formatMinutes(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.max(1, Math.round(seconds / 60));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

/**
 * Parse an API date. A value without a timezone (`YYYY-MM-DDTHH:mm:ss`) is
 * local time (API §4), which is also how `Date` reads it.
 */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Oct 12, 4:20 PM" */
export function formatDateTime(value: string | Date | null | undefined): string {
  const d = value instanceof Date ? value : parseDate(value);
  if (!d) return '';
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date}, ${time}`;
}

/** "Oct 12, 2026" */
export function formatDate(value: string | Date | null | undefined): string {
  const d = value instanceof Date ? value : parseDate(value);
  if (!d) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "4:20 PM" */
export function formatTime(value: string | Date | null | undefined): string {
  const d = value instanceof Date ? value : parseDate(value);
  if (!d) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "Today, 10:42", "Yesterday, 9:00", otherwise "Oct 12, 10:42". */
export function formatDayTime(value: string | null | undefined, now: Date = new Date()): string {
  const d = parseDate(value);
  if (!d) return '';
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days === 0) return `Today, ${formatTime(d)}`;
  if (days === 1) return `Yesterday, ${formatTime(d)}`;
  return formatDateTime(d);
}
