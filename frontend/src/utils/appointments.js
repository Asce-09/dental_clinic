// Shared appointment helpers used by the Appointments page, the Patients
// "by appointment date" view, and the patient's Appointments tab.

export function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = ((+h + 11) % 12) + 1;
  const ampm = +h < 12 ? 'AM' : 'PM';
  return `${hour}:${m} ${ampm}`;
}

export function formatDayLabel(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function formatShortDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

export const STATUS_FLOW = ['pending', 'confirmed', 'checked_in', 'in_progress', 'completed'];
export const CAME_STATUSES = ['checked_in', 'in_progress', 'completed'];
export const CLOSED_STATUSES = ['cancelled', 'completed', 'no_show'];

// Quick time-of-day filter chips, matching how a busy front desk actually
// thinks about a day: morning / midday / afternoon / evening blocks.
export const TIME_RANGES = [
  { key: 'morning', label: '07:00 - 10:00', start: '07:00', end: '10:00' },
  { key: 'midday', label: '10:00 - 13:00', start: '10:00', end: '13:00' },
  { key: 'afternoon', label: '13:00 - 17:00', start: '13:00', end: '17:00' },
  { key: 'evening', label: '17:00 - 20:00', start: '17:00', end: '20:00' },
];

export function inRange(time, range) {
  return time >= range.start && time < range.end;
}

export function ageFromBirthDate(birthDate) {
  if (!birthDate) return '—';
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return '—';
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}
