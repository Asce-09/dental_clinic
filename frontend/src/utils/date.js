// Local-timezone-safe date helpers.
//
// Never use `Date#toISOString().slice(0, 10)` to turn a Date back into a
// "YYYY-MM-DD" string — toISOString() converts to UTC first, which silently
// shifts the date by a day in any timezone ahead of UTC (exactly what broke
// the Appointments page's Prev/Next buttons: Prev jumped back 2 days and
// Next did nothing, because the UTC round-trip quietly ate a day on every
// call). These use the Date object's local-time getters instead, so the
// string always matches the calendar date the user actually sees.

export function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStr() {
  return toDateStr(new Date());
}
