// Pure timesheet math, shared by the Time Clock module and the home launcher.
import * as store from '../core/store.js';
import { isoDate, addDays, startOfWeek } from '../core/util.js';

export const PUNCH_FIELDS = ['clockIn', 'lunchOut', 'lunchIn', 'clockOut'];
export const PUNCH_LABELS = { clockIn: 'Clock In', lunchOut: 'Lunch Out', lunchIn: 'Lunch In', clockOut: 'Clock Out' };

const mins = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const span = (a, b) => { let d = mins(b) - mins(a); if (d < 0) d += 24 * 60; return d; };

/** (clock out − clock in) − lunch gap, in hours. null when the day is incomplete. */
export function dayHours(p) {
  if (!p || !p.clockIn || !p.clockOut) return null;
  let m = span(p.clockIn, p.clockOut);
  if (p.lunchOut && p.lunchIn) m -= span(p.lunchOut, p.lunchIn);
  return Math.max(0, m) / 60;
}
export const fmtHours = (h) => (h == null ? '' : h.toFixed(2));

export function punchFor(dateIso) { return store.find('punch', p => p.date === dateIso); }

export function weekDays(weekStart) { return Array.from({ length: 7 }, (_, i) => isoDate(addDays(weekStart, i))); }

export function weekTotal(weekStart) {
  return weekDays(weekStart).reduce((sum, d) => sum + (dayHours(punchFor(d)) || 0), 0);
}
export const thisWeekHours = () => weekTotal(startOfWeek(new Date()));

/** Which punch is allowed next for a day record. */
export function nextAllowed(p) {
  if (!p || !p.clockIn) return new Set(['clockIn']);
  if (p.clockOut) return new Set();
  if (!p.lunchOut) return new Set(['lunchOut', 'clockOut']);
  if (!p.lunchIn) return new Set(['lunchIn']);
  return new Set(['clockOut']);
}
