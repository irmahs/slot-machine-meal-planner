const DAY_MS = 86_400_000;

export function todayISO(): string {
  return toISO(new Date());
}

export function addDaysISO(days: number, from: Date = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

/** Days remaining, floored at 1 so an overdue item reads as "use today" rather than a negative. */
export function daysUntil(iso: string): number {
  const target = new Date(`${iso}T00:00:00`);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((target.getTime() - start.getTime()) / DAY_MS));
}

export function dayLabel(iso: string): string {
  return iso === todayISO()
    ? 'Tonight'
    : new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });
}

function toISO(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
