const DAY_MS = 86_400_000;

/** Parse a YYYY-MM-DD string to a UTC epoch-day integer. */
export function toEpochDay(iso: string): number {
  return Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);
}

export function isoFromEpochDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return isoFromEpochDay(toEpochDay(iso) + n);
}

export function daysBetween(a: string, b: string): number {
  return Math.abs(toEpochDay(a) - toEpochDay(b));
}

export function isWeekend(iso: string): boolean {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return dow === 0 || dow === 6;
}
