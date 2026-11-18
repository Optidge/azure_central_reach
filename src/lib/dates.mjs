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

export function addSeconds(date, seconds) {
  const base = date instanceof Date ? date : new Date(date);
  return new Date(base.getTime() + seconds * 1000);
}
