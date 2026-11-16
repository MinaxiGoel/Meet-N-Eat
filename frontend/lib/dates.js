// Calendar helpers. A "period" is a month, written as "YYYY-MM-01" (UTC month).

export function currentPeriod(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function parts(period) {
  const [y, m] = period.split("-").map(Number);
  return { y, m };
}

export function shiftPeriod(period, months) {
  const { y, m } = parts(period);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return currentPeriod(d);
}
export const nextPeriod = (period) => shiftPeriod(period, 1);
export const previousPeriod = (period) => shiftPeriod(period, -1);

const at = (period, day, hour = 0) => {
  const { y, m } = parts(period);
  return new Date(Date.UTC(y, m - 1, day, hour));
};

// Check-in emails start on the 3rd. Members who join after this don't need one that month.
export const checkinStartAt = (period) => at(period, 3);
// Round 1 pairing: 10:00 UTC on the 7th, when the 8th begins in the earliest time zone (UTC+14).
export const round1At = (period) => at(period, 7, 10);
// Round 2 pairing (only if needed): 10:00 UTC on the 11th.
export const round2At = (period) => at(period, 11, 10);

export function monthLabel(period, withYear = false) {
  const { y, m } = parts(period);
  return new Intl.DateTimeFormat("en", {
    month: "long", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function isValidTimeZone(tz) {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
}
export const safeTimeZone = (tz) => (isValidTimeZone(tz) ? tz : "UTC");

export function localParts(now, tz) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(tz), year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", hourCycle: "h23",
  }).formatToParts(now);
  const get = (type) => Number(formatted.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") };
}

// Which day of `period` it is for someone in `tz`.
// Returns -Infinity if their local date is still in an earlier month, Infinity if later.
export function localDayInPeriod(now, tz, period) {
  const local = localParts(now, tz);
  const { y, m } = parts(period);
  const localIndex = local.year * 12 + local.month;
  const periodIndex = y * 12 + m;
  if (localIndex < periodIndex) return -Infinity;
  if (localIndex > periodIndex) return Infinity;
  return local.day;
}

// True once it's on/after `day` of the period at `hour` o'clock, in the member's own time zone.
export function isLocalTimeReached(now, tz, period, day, hour = 0) {
  const localDay = localDayInPeriod(now, tz, period);
  if (localDay !== day) return localDay > day;
  return localParts(now, tz).hour >= hour;
}

export const REVEAL_DAY = 8;
export const CHECKIN_DAY = 3;
export const MATCH_EMAIL_DAY = 10;
export const SEND_HOUR = 9;
