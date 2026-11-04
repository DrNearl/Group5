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
              student: true,
              labRoom: true,
              shift: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.student.findMany({
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

    // Thống kê theo từng sinh viên & đánh giá chuyên cần
    const studentStats = students.map((sv) => {
      const logs = sv.dutySchedules
        .map((s) => s.attendanceLog)
        .filter((l): l is NonNullable<typeof l> => l !== null);
      const totalHours = logs.reduce((acc, l) => acc + (l.totalHours || 0), 0);
      const onTime = logs.filter((l) => l.attendanceStatus === "ON_TIME").length;
      const late = logs.filter((l) => l.attendanceStatus === "LATE").length;
      const roundedHours = Math.round(totalHours * 10) / 10;

      // Tìm lượt trực gần nhất
      const sortedLogs = [...logs].sort((a, b) => new Date(b.checkInTime || b.createdAt).getTime() - new Date(a.checkInTime || a.createdAt).getTime());
      const lastLog = sortedLogs[0];
      const lastDutyDate = lastLog?.checkInTime
        ? new Date(lastLog.checkInTime).toLocaleDateString("vi-VN")
        : null;

      let diligence = "Ít tham gia";
      let diligenceTag = "LOW";
      if (roundedHours >= 15) {
        diligence = "Chăm chỉ";
        diligenceTag = "HIGH";
      } else if (roundedHours >= 5) {
        diligence = "Đạt yêu cầu";
        diligenceTag = "MEDIUM";
      }

      return {
        id: sv.id,
        fullName: sv.fullName,
        studentCode: sv.studentCode,
        totalShifts: sv.dutySchedules.length,
        completedShifts: logs.filter((l) => l.checkOutTime !== null).length,
        totalHours: roundedHours,
        onTime,
        late,
        lastDutyDate,
        diligence,
        diligenceTag,
      };
    });

    // Phân bố khung giờ cao điểm (Peak Hours Distribution)
    const peakHoursMap: { [key: string]: number } = {
      "07:00 - 09:00": 0,
      "09:00 - 11:30": 0,
      "11:30 - 13:30": 0,
      "13:30 - 15:30": 0,
      "15:30 - 17:30": 0,
      "17:30 - 21:00": 0,
    };

    attendanceLogs.forEach((l) => {
      if (!l.checkInTime) return;
      const d = new Date(l.checkInTime);
      const h = d.getHours() + d.getMinutes() / 60;
      if (h >= 7 && h < 9) peakHoursMap["07:00 - 09:00"]++;
      else if (h >= 9 && h < 11.5) peakHoursMap["09:00 - 11:30"]++;
      else if (h >= 11.5 && h < 13.5) peakHoursMap["11:30 - 13:30"]++;
      else if (h >= 13.5 && h < 15.5) peakHoursMap["13:30 - 15:30"]++;
      else if (h >= 15.5 && h < 17.5) peakHoursMap["15:30 - 17:30"]++;
      else if (h >= 17.5 && h <= 21) peakHoursMap["17:30 - 21:00"]++;
    });

    const peakHoursData = Object.entries(peakHoursMap).map(([timeSlot, count]) => ({
      timeSlot,
      count,
    }));

    // Phân bổ số giờ theo ngày trong tuần (Thứ 2 -> Chủ Nhật)
    const weekdayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const weekdayMap: { [key: string]: number } = {
      "Thứ Hai": 0,
      "Thứ Ba": 0,
      "Thứ Tư": 0,
      "Thứ Năm": 0,
      "Thứ Sáu": 0,
      "Thứ Bảy": 0,
      "Chủ Nhật": 0,
    };

    attendanceLogs.forEach((l) => {
      if (!l.checkInTime) return;
      const dayIndex = new Date(l.checkInTime).getDay();
      const dayName = weekdayNames[dayIndex];
      if (weekdayMap[dayName] !== undefined) {
        weekdayMap[dayName] += l.totalHours > 0 ? l.totalHours : 1;
      }
    });

    const weekdayData = Object.entries(weekdayMap).map(([day, hours]) => ({
      day,
      hours: Math.round(hours * 10) / 10,
    }));

    // Danh sách sinh viên đang có mặt trong phòng Lab (Live)
    const activeInLab = attendanceLogs
      .filter((l) => l.checkInTime && !l.checkOutTime)
      .map((l) => {
        const checkIn = new Date(l.checkInTime!);
        const elapsedSec = Math.max(1, Math.floor((Date.now() - checkIn.getTime()) / 1000));
        const h = Math.floor(elapsedSec / 3600);
        const m = Math.floor((elapsedSec % 3600) / 60);
        const duration = h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
        const isStale = h >= 5; // Cảnh báo nếu ở quá 5 tiếng (nghi vấn quên quẹt về)

        return {
          id: l.id,
          studentName: l.dutySchedule.student.fullName,
          studentCode: l.dutySchedule.student.studentCode,
          labName: l.dutySchedule.labRoom.labName,
          checkInTime: l.checkInTime,
          snapshot: l.checkInSnapshot,
          scanMethod: l.scanMethod,
          duration,
          isStale,
        };
      });

    const completedLogs = attendanceLogs.filter((l) => l.checkInTime && l.checkOutTime);
    const avgHours = completedLogs.length > 0
      ? Math.round((totalHoursAll / completedLogs.length) * 10) / 10
      : 0;
    const completionRate = attendanceLogs.length > 0
      ? Math.round((completedLogs.length / attendanceLogs.length) * 100)
      : 100;
    const staleCount = activeInLab.filter((s) => s.isStale).length;

    return NextResponse.json({
      success: true,
      stats: {
        totalSchedules,
        totalLogs: attendanceLogs.length,
        totalStudents: students.length,
        onTimeCount,
        lateCount,
        totalHours: Math.round(totalHoursAll * 10) / 10,
        avgHours,
        completionRate,
        staleCount,
        openIncidents: incidents.filter((i) => i.incidentStatus !== "RESOLVED").length,
        activeInLabCount: activeInLab.length,
      },
      peakHoursData,
      weekdayData,
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
          studentName: l.dutySchedule.student.fullName,
          studentCode: l.dutySchedule.student.studentCode,
          dutyDate: l.dutySchedule.dutyDate,
          shiftName: l.dutySchedule.shift.shiftName,
          labName: l.dutySchedule.labRoom.labName,
          checkInTime: l.checkInTime,
          checkOutTime: l.checkOutTime,
          attendanceStatus: l.attendanceStatus,
          totalHours: l.totalHours,
          durationText: durationText,
          scanMethod: l.scanMethod,
          snapshot: l.checkInSnapshot,
        };
      }),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// Giảng viên điểm danh bổ sung thủ công khi sinh viên quên thẻ
export async function handleManualAttendanceCreate(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentCode, dutyDate, checkInTimeStr, checkOutTimeStr, note } = body;

    if (!studentCode || !dutyDate || !checkInTimeStr) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập đầy đủ MSSV, ngày và giờ vào!" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { studentCode: studentCode.trim() },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: `Không tìm thấy sinh viên có MSSV: ${studentCode}` },
        { status: 404 }
      );
    }

    let defaultLab = await prisma.labRoom.findFirst();
    let defaultShift = await prisma.shift.findFirst();

    if (!defaultLab || !defaultShift) {
      return NextResponse.json(
        { success: false, message: "Chưa cấu hình phòng lab hoặc ca trực!" },
        { status: 400 }
      );
    }

    const checkIn = new Date(`${dutyDate}T${checkInTimeStr}:00`);
    let checkOut: Date | null = null;
    let totalHours = 0;

    if (checkOutTimeStr) {
      checkOut = new Date(`${dutyDate}T${checkOutTimeStr}:00`);
      const diffMs = Math.max(1000, checkOut.getTime() - checkIn.getTime());
      totalHours = Math.round((diffMs / 3600000) * 100) / 100;
    }

    const schedule = await prisma.dutySchedule.create({
      data: {
        studentId: student.id,
        labId: defaultLab.id,
        shiftId: defaultShift.id,
        dutyDate: new Date(dutyDate),
        scheduleStatus: checkOut ? "COMPLETED" : "APPROVED",
        note: note ? `[Bổ sung thủ công] ${note}` : "[Bổ sung thủ công]",
      },
    });

    const newLog = await prisma.attendanceLog.create({
      data: {
        scheduleId: schedule.id,
        scannedBarcode: student.studentCode,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        totalHours,
        scanMethod: "USB_SCANNER",
        attendanceStatus: "ON_TIME",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã ghi nhận điểm danh bổ sung cho sinh viên ${student.fullName}!`,
      logId: newLog.id,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

