import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentDisplayName } from "@/lib/student-display";

export async function handleQrLive() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = await prisma.attendanceLog.findMany({
      where: {
        checkInTime: {
          gte: today,
        },
      },
      include: {
        dutySchedule: {
          include: {
            student: {
              select: {
                fullName: true,
                studentCode: true,
                email: true,
                profileStatus: true,
              },
            },
            labRoom: {
              select: {
                labName: true,
                building: true,
              },
            },
          },
        },
      },
      orderBy: {
        checkInTime: "desc",
      },
      take: 20,
    });

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      studentName: getStudentDisplayName(log.dutySchedule?.student?.fullName),
      studentCode: log.dutySchedule?.student?.studentCode || log.scannedBarcode,
      isPendingProfile: log.dutySchedule?.student?.profileStatus === "PENDING",
      checkInTime: log.checkInTime,
      checkOutTime: log.checkOutTime,
      scanMethod: log.scanMethod,
      status: log.attendanceStatus,
    }));

    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      totalCount: formattedLogs.length,
    });
  } catch (error: any) {
    console.error("Lỗi lấy live logs:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi nạp dữ liệu: " + error.message },
      { status: 500 }
    );
  }
}
