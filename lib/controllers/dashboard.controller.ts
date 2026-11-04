import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function handleDashboardGet(req: NextRequest) {
  try {
    const [totalSchedules, attendanceLogs, students, incidents, labs] = await Promise.all([
      prisma.dutySchedule.count(),
      prisma.attendanceLog.findMany({
        include: {
          dutySchedule: {
            include: {
              user: true,
              labRoom: true,
              shift: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { role: "STUDENT" },
        include: {
          dutySchedules: {
            include: {
              attendanceLog: true,
              shift: true,
            },
          },
        },
      }),
      prisma.equipmentIncident.findMany({
        include: {
          equipment: true,
          reportedBy: true,
        },
      }),
      prisma.labRoom.findMany(),
    ]);

    // Thống kê tổng hợp
    const onTimeCount = attendanceLogs.filter((l) => l.attendanceStatus === "ON_TIME").length;
    const lateCount = attendanceLogs.filter((l) => l.attendanceStatus === "LATE").length;
    const totalHoursAll = attendanceLogs.reduce((acc, l) => acc + (l.totalHours || 0), 0);

    // Thống kê theo từng sinh viên
    const studentStats = students.map((sv) => {
      const logs = sv.dutySchedules
        .map((s) => s.attendanceLog)
        .filter((l): l is NonNullable<typeof l> => l !== null);
      const totalHours = logs.reduce((acc, l) => acc + (l.totalHours || 0), 0);
      const onTime = logs.filter((l) => l.attendanceStatus === "ON_TIME").length;
      const late = logs.filter((l) => l.attendanceStatus === "LATE").length;

      return {
        id: sv.id,
        fullName: sv.fullName,
        studentCode: sv.studentCode,
        totalShifts: sv.dutySchedules.length,
        completedShifts: logs.filter((l) => l.checkOutTime !== null).length,
        totalHours: Math.round(totalHours * 10) / 10,
        onTime,
        late,
      };
    });

    // Danh sách sinh viên đang có mặt trong phòng Lab (Live)
    const activeInLab = attendanceLogs
      .filter((l) => l.checkInTime && !l.checkOutTime)
      .map((l) => {
        const checkIn = new Date(l.checkInTime!);
        const elapsedSec = Math.max(1, Math.floor((Date.now() - checkIn.getTime()) / 1000));
        const h = Math.floor(elapsedSec / 3600);
        const m = Math.floor((elapsedSec % 3600) / 60);
        const duration = h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;

        return {
          id: l.id,
          studentName: l.dutySchedule.user.fullName,
          studentCode: l.dutySchedule.user.studentCode,
          labName: l.dutySchedule.labRoom.labName,
          checkInTime: l.checkInTime,
          snapshot: l.checkInSnapshot,
          scanMethod: l.scanMethod,
          duration,
        };
      });

    return NextResponse.json({
      success: true,
      stats: {
        totalSchedules,
        totalLogs: attendanceLogs.length,
        onTimeCount,
        lateCount,
        totalHours: Math.round(totalHoursAll * 10) / 10,
        openIncidents: incidents.filter((i) => i.incidentStatus !== "RESOLVED").length,
        activeInLabCount: activeInLab.length,
      },
      activeInLab,
      studentStats,
      allLogs: attendanceLogs.map((l) => {
        let durationText = "--";
        if (l.checkInTime && l.checkOutTime) {
          const diffSeconds = Math.max(
            1,
            Math.floor((new Date(l.checkOutTime).getTime() - new Date(l.checkInTime).getTime()) / 1000)
          );
          const h = Math.floor(diffSeconds / 3600);
          const m = Math.floor((diffSeconds % 3600) / 60);
          const s = diffSeconds % 60;
          if (h > 0) durationText = `${h} giờ ${m} phút`;
          else if (m > 0) durationText = `${m} phút ${s} giây`;
          else durationText = `${s} giây`;
        }
        return {
          id: l.id,
          studentName: l.dutySchedule.user.fullName,
          studentCode: l.dutySchedule.user.studentCode,
          dutyDate: l.dutySchedule.dutyDate,
          shiftName: l.dutySchedule.shift.shiftName,
          labName: l.dutySchedule.labRoom.labName,
          checkInTime: l.checkInTime,
          checkOutTime: l.checkOutTime,
          attendanceStatus: l.attendanceStatus,
          totalHours: l.totalHours,
          durationText: durationText,
          scanMethod: l.scanMethod,
        };
      }),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
