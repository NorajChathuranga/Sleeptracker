import { format, getHours, getMinutes, isValid, parseISO } from 'date-fns';

export function formatDuration(minutes: number | null): string {
  if (minutes === null || Number.isNaN(minutes)) return '--';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function formatClockFromIso(iso: string | null): string {
  if (!iso) return '--';
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return '--';
  return format(parsed, 'hh:mm a');
}

export function toAdjustedMinutes(date: Date): number {
  const h = getHours(date);
  const m = getMinutes(date);
  return (h < 12 ? h + 24 : h) * 60 + m;
}

export function adjustedHourDecimal(date: Date): number {
  const h = getHours(date);
  const m = getMinutes(date);
  const adjustedHour = h < 12 ? h + 24 : h;
  return adjustedHour + m / 60;
}

export function formatDateLabel(date: Date): string {
  return format(date, 'EEE');
}

export function parseBedtimeToHM(hhmm: string): { hour: number; minute: number } {
  const [hour, minute] = hhmm.split(':').map(Number);
  return {
    hour: Number.isFinite(hour) ? hour : 22,
    minute: Number.isFinite(minute) ? minute : 30,
  };
}
