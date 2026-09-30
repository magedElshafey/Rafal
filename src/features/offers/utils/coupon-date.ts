// Laravel timestamps without an offset are interpreted as UTC, never local time.
// Reject impossible calendar dates instead of allowing Date to normalize them.
export function couponTimestampToDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})?$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, fraction, zone] = match;
  const leap = Number(year) % 4 === 0 && (Number(year) % 100 !== 0 || Number(year) % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 ||
      Number(day) > days[Number(month) - 1] || Number(hour) > 23 ||
      Number(minute) > 59 || Number(second) > 59) return null;
  const milliseconds = fraction ? fraction.slice(0, 4).padEnd(4, "0") : "";
  const date = new Date(
    year + "-" + month + "-" + day + "T" + hour + ":" + minute + ":" + second + milliseconds + (zone ?? "Z"),
  );
  return Number.isFinite(date.getTime()) ? date : null;
}
