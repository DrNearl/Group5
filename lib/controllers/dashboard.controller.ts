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

    // Thống kê theo từng sinh viên: chi tiết Ca Sáng, Ca Chiều & chuyên cần
    const studentStats = students.map((sv) => {
      const logs = sv.dutySchedules
        .map((s) => s.attendanceLog)
        .filter((l): l is NonNullable<typeof l> => l !== null);
      const totalHours = logs.reduce((acc, l) => acc + (l.totalHours || 0), 0);
      const onTime = logs.filter((l) => l.attendanceStatus === "ON_TIME").length;
      const late = logs.filter((l) => l.attendanceStatus === "LATE").length;
      const roundedHours = Math.round(totalHours * 10) / 10;

      // Phân loại ca Sáng (08:00 - 12:00) và ca Chiều (13:00 - 17:00)
      let morningShifts = 0;
      let afternoonShifts = 0;

      logs.forEach((l) => {
        if (!l.checkInTime) return;
        const d = new Date(l.checkInTime);
        const checkInHour = d.getHours() + d.getMinutes() / 60;
        if (checkInHour < 12.5) {
          morningShifts += 1;
        } else {
          afternoonShifts += 1;
        }
      });

      // Tìm lượt trực gần nhất
      const sortedLogs = [...logs].sort((a, b) => new Date(b.checkInTime || b.createdAt).getTime() - new Date(a.checkInTime || a.createdAt).getTime());
      const lastLog = sortedLogs[0];
      const lastDutyDate = lastLog?.checkInTime
        ? new Date(lastLog.checkInTime).toLocaleDateString("vi-VN")
        : null;

      const completedCount = logs.filter((l) => l.checkOutTime !== null).length;

      return {
        id: sv.id,
        fullName: sv.fullName,
        studentCode: sv.studentCode,
        className: sv.className || "K29CNTT16",
        morningShifts,
        afternoonShifts,
        totalShifts: sv.dutySchedules.length,
        completedShifts: completedCount,
        totalHours: roundedHours,
        onTime,
        late,
        lastDutyDate,
      };
    });

    // Phân bổ số người trực & số lượt theo ngày làm việc trong tuần (Thứ Hai -> Thứ Bảy; Chủ Nhật nghỉ)
    const weekdayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const weekdayAttendees: { [key: string]: Set<string> } = {
      "Thứ Hai": new Set(),
      "Thứ Ba": new Set(),
      "Thứ Tư": new Set(),
      "Thứ Năm": new Set(),
      "Thứ Sáu": new Set(),
      "Thứ Bảy": new Set(),
    };
    const weekdayShifts: { [key: string]: number } = {
      "Thứ Hai": 0,
      "Thứ Ba": 0,
      "Thứ Tư": 0,
      "Thứ Năm": 0,
      "Thứ Sáu": 0,
      "Thứ Bảy": 0,
    };
    const weekdayHours: { [key: string]: number } = {
      "Thứ Hai": 0,
      "Thứ Ba": 0,
      "Thứ Tư": 0,
      "Thứ Năm": 0,
      "Thứ Sáu": 0,
      "Thứ Bảy": 0,
    };

    // Phân bổ giờ theo ca làm việc chuẩn Xưởng thực tập (Ca Sáng: 08:00 - 12:00, Ca Chiều: 13:00 - 17:00)
    let morningHours = 0;
    let afternoonHours = 0;

    attendanceLogs.forEach((l) => {
      if (!l.checkInTime) return;
      const d = new Date(l.checkInTime);
      const dayIndex = d.getDay();
      const dayName = weekdayNames[dayIndex];
      const hrs = l.totalHours > 0 ? l.totalHours : 0;
      const studentId = l.dutySchedule?.student?.id || l.dutySchedule?.student?.studentCode || "";

      if (weekdayAttendees[dayName] !== undefined) {
        if (studentId) weekdayAttendees[dayName].add(studentId);
        weekdayShifts[dayName] += 1;
        weekdayHours[dayName] += hrs;
      }

      const checkInHour = d.getHours() + d.getMinutes() / 60;
      if (checkInHour < 12) {
        morningHours += hrs;
      } else {
        afternoonHours += hrs;
      }
    });

    const weekdayData = Object.entries(weekdayAttendees).map(([day, studentSet]) => ({
      day,
      peopleCount: studentSet.size,
      shiftCount: weekdayShifts[day] || 0,
      hours: Math.round((weekdayHours[day] || 0) * 10) / 10,
    }));

    const shiftDistribution = [
      { shift: "Ca Sáng (08:00 - 12:00)", hours: Math.round(morningHours * 10) / 10 },
      { shift: "Ca Chiều (13:00 - 17:00)", hours: Math.round(afternoonHours * 10) / 10 },
    ];

    // Danh sách sinh viên đang có mặt trong phòng Lab (Live)
    const activeInLab = attendanceLogs
      .filter((l) => l.checkInTime && !l.checkOutTime)
      .map((l) => {
        const checkIn = new Date(l.checkInTime!);
        const elapsedSec = Math.max(1, Math.floor((Date.now() - checkIn.getTime()) / 1000));
        const h = Math.floor(elapsedSec / 3600);
        const m = Math.floor((elapsedSec % 3600) / 60);
        const duration = h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
        const isStale = h >= 4; // Cảnh báo nếu ở quá 4 tiếng (vượt khung ca làm việc VLU)

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
      shiftDistribution,
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

