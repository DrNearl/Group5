import prisma from "@/lib/prisma";
import { classifyOpenSession } from "@/lib/attendance-rules";

const MISSING_CHECKOUT = "MISSING_CHECKOUT";

export async function closeAsMissingCheckout(logId: string): Promise<boolean> {
  const result = await prisma.attendanceLog.updateMany({
    where: {
      id: logId,
      checkOutTime: null,
      attendanceStatus: { not: MISSING_CHECKOUT },
    },
    data: {
      attendanceStatus: MISSING_CHECKOUT,
      checkOutTime: null,
      totalHours: 0,
    },
  });

  return result.count > 0;
}

export async function closeStaleOpenSessions(now: Date): Promise<{
  closedCount: number;
  studentCodes: string[];
}> {
  const openLogs = await prisma.attendanceLog.findMany({
    where: {
      checkOutTime: null,
      attendanceStatus: { not: MISSING_CHECKOUT },
    },
    select: {
      id: true,
      checkInTime: true,
      scannedBarcode: true,
    },
  });

  const staleLogs = openLogs.filter(
    (log) =>
      log.checkInTime &&
      classifyOpenSession(log.checkInTime, now) !== "VALID"
  );
  const closedStudentCodes = new Set<string>();
  let closedCount = 0;

  for (const log of staleLogs) {
    try {
      if (await closeAsMissingCheckout(log.id)) {
        closedCount += 1;
        closedStudentCodes.add(log.scannedBarcode);
      }
    } catch (error) {
      console.error(`Không thể tự đóng lượt tồn đọng ${log.id}:`, error);
    }
  }

  return { closedCount, studentCodes: Array.from(closedStudentCodes) };
}
