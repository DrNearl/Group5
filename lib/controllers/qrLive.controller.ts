import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      studentName: log.dutySchedule?.student?.fullName || "Sinh viên",
      studentCode: log.dutySchedule?.student?.studentCode || log.scannedBarcode,
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
