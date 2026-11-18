export const MAX_SESSION_HOURS = 10;
export const LAB_TIMEZONE = "Asia/Ho_Chi_Minh";
export const MIN_SECONDS_BEFORE_CHECKOUT = 120;
export const MIN_SECONDS_BEFORE_RECHECKIN = 30;
export const SHORT_VISIT_MINUTES = 5;

export function getCooldownRemainingSeconds(
  sinceDate: Date,
  now: Date,
  minimumSeconds: number
): number {
  const remainingMs = minimumSeconds * 1000 - (now.getTime() - sinceDate.getTime());
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function formatCooldownWait(remainingSeconds: number): string {
  if (remainingSeconds >= 60) {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes} phút ${seconds} giây`;
  }
  return `${remainingSeconds} giây`;
}

function getLabDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LAB_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function getLabDateKey(date: Date): string {
  const parts = getLabDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatLabTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LAB_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.hour}:${values.minute}:${values.second}`;
}

export function formatLabTimeAndDate(date: Date): string {
  const parts = getLabDateParts(date);
  const time = formatLabTime(date);
  return `${time.slice(0, 5)} ${parts.day}/${parts.month}`;
}

export function classifyOpenSession(
  checkInTime: Date,
  now: Date
): "VALID" | "STALE_OTHER_DAY" | "STALE_TOO_LONG" {
  if (getLabDateKey(checkInTime) !== getLabDateKey(now)) {
    return "STALE_OTHER_DAY";
  }

  const elapsedMs = now.getTime() - checkInTime.getTime();
  if (elapsedMs > MAX_SESSION_HOURS * 60 * 60 * 1000) {
    return "STALE_TOO_LONG";
  }

  return "VALID";
}
