type AttendanceHourLog = {
  checkInTime: Date | string | null;
  checkOutTime: Date | string | null;
  totalHours: number;
};

export type AttendanceInterval = {
  start: Date;
  end: Date;
};

/** Merge overlapping sessions so duplicate/manual logs do not add the same minutes twice. */
export function getUniqueAttendanceIntervals(logs: AttendanceHourLog[]): AttendanceInterval[] {
  const intervals = logs.flatMap((log) => {
    if (!log.checkInTime) return [];
    const start = new Date(log.checkInTime);
    const end = log.checkOutTime
      ? new Date(log.checkOutTime)
      : log.totalHours > 0
        ? new Date(start.getTime() + log.totalHours * 3_600_000)
        : null;
    return end && end > start ? [{ start, end }] : [];
  }).sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: AttendanceInterval[] = [];
  for (const interval of intervals) {
    const previous = merged[merged.length - 1];
    if (previous && interval.start <= previous.end) {
      if (interval.end > previous.end) previous.end = interval.end;
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

export function getUniqueAttendanceHours(logs: AttendanceHourLog[]): number {
  const intervals = getUniqueAttendanceIntervals(logs);
  const legacyHours = logs
    .filter((log) => !log.checkInTime && log.totalHours > 0)
    .reduce((total, log) => total + log.totalHours, 0);
  const intervalHours = intervals.reduce((total, interval) => total + (interval.end.getTime() - interval.start.getTime()) / 3_600_000, 0);
  return intervalHours + legacyHours;
}
