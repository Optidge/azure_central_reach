export function nowIso() {
  return new Date().toISOString();
}

// A filled value that is not a real calendar date is "unreadable", never "blank".
// Only YYYY-MM-DD and ISO date-times (YYYY-MM-DDT...) are read. JavaScript's loose parser is not
// used: it reads "5" as a date.
export function readDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "blank";
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})(T.*)?$/.exec(raw);
  if (!match) {
    return "unreadable";
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const calendarDay = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDay.getUTCFullYear() !== year ||
    calendarDay.getUTCMonth() !== month - 1 ||
    calendarDay.getUTCDate() !== day
  ) {
    return "unreadable";
  }
  if (!match[4]) {
    return raw;
  }
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) {
    return "unreadable";
  }
  return parsed.toISOString().slice(0, 10);
}

// The employee date of birth (`date_of_birth` on the BCBA and the BT/RBT, items 1 and 16) is a
// text property in production, so people type it in many ways. `readDate` stays strict for the
// HubSpot date pickers (Case dates); this reader is for typed date text. Same answers: "YYYY-MM-DD",
// "blank" or "unreadable". Every form is parsed by hand (never `new Date(string)`), and the
// calendar date is built in UTC, so no time zone can move it a day.
// Accepted, after trimming:
//   1990-01-05, 1990-1-5, 1990/01/05, 1990-01-05T00:00:00Z, 1990-01-05 10:30 (the date as written)
//   631497600000 or -631152000000: epoch milliseconds at midnight UTC (how a HubSpot date picker
//     stores a date); 0 and any other number are unreadable, so "5" or "19900105" is never a date
//   1/5/1990, 01/05/1990, 01-05-1990, 01.05.1990: month first (US)
//   Jan 5, 1990 / January 5th 1990 / Jan. 5 1990 / 5 Jan 1990 / 5 January, 1990
// Unreadable: two-digit years (01/05/90 could be 1990 or 2090, and 05/01/20 could be 1920 or
// 2020), impossible dates (02/30/1990, month 13), years before 1900 and dates after today (UTC).
const MIN_YEAR = 1900;
const DAY_MS = 86400000;
const MONTHS = Object.freeze({
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
});
const ISO_DATE = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?\s*(?:Z|[+-]\d{2}:?\d{2})?)?$/i;
const EPOCH_MS = /^-?\d{1,15}$/;
const US_DATE = /^(\d{1,2})([-/.])(\d{1,2})\2(\d{4})$/;
const MONTH_DAY_YEAR = /^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i;
const DAY_MONTH_YEAR = /^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?,?\s+(\d{4})$/i;

function pad(number, width) {
  return String(number).padStart(width, "0");
}

function calendarDate(year, month, day, today) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return "unreadable";
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < MIN_YEAR ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "unreadable";
  }
  const text = `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
  return text > today ? "unreadable" : text;
}

function epochDate(raw, today) {
  const ms = Number(raw);
  if (!Number.isSafeInteger(ms) || ms === 0 || ms % DAY_MS !== 0) {
    return "unreadable";
  }
  const date = new Date(ms);
  return calendarDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), today);
}

export function readTextDate(value, { now = new Date() } = {}) {
  const raw = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!raw) {
    return "blank";
  }
  const today = now.toISOString().slice(0, 10);
  let match = ISO_DATE.exec(raw);
  if (match) {
    return calendarDate(Number(match[1]), Number(match[2]), Number(match[3]), today);
  }
  if (EPOCH_MS.test(raw)) {
    return epochDate(raw, today);
  }
  match = US_DATE.exec(raw);
  if (match) {
    return calendarDate(Number(match[4]), Number(match[1]), Number(match[3]), today);
  }
  match = MONTH_DAY_YEAR.exec(raw);
  if (match) {
    return calendarDate(Number(match[3]), MONTHS[match[1].toLowerCase()], Number(match[2]), today);
  }
  match = DAY_MONTH_YEAR.exec(raw);
  if (match) {
    return calendarDate(Number(match[3]), MONTHS[match[2].toLowerCase()], Number(match[1]), today);
  }
  return "unreadable";
}

export function addSeconds(date, seconds) {
  const base = date instanceof Date ? date : new Date(date);
  return new Date(base.getTime() + seconds * 1000);
}
