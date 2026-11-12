import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getValidStudentCode } from "@/lib/studentCode";
import { getUniqueAttendanceHours, getUniqueAttendanceIntervals } from "@/lib/attendance-hours";
import { getStudentDisplayName } from "@/lib/student-display";

export async function handleDashboardGet(req: NextRequest) {
  try {
    const [totalSchedules, attendanceLogs, students, incidents, labs] = await Promise.all([
      prisma.dutySchedule.count({ where: { student: { isActive: true } } }),
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
        where: { isActive: true },
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

    // Thống kê chỉ tính hồ sơ đang hoạt động; attendanceLogs vẫn giữ toàn bộ lịch sử.
    const activeAttendanceLogs = attendanceLogs.filter((l) => l.dutySchedule.student.isActive);
    const activeLogsByStudent = new Map<string, typeof activeAttendanceLogs>();
    for (const log of activeAttendanceLogs) {
      const studentId = log.dutySchedule.studentId;
      const studentLogs = activeLogsByStudent.get(studentId) || [];
      studentLogs.push(log);
      activeLogsByStudent.set(studentId, studentLogs);
    }
    const totalHoursAll = Array.from(activeLogsByStudent.values())
      .reduce((total, logs) => total + getUniqueAttendanceHours(logs), 0);
    const onTimeCount = activeAttendanceLogs.filter((l) => l.attendanceStatus === "ON_TIME").length;
    const lateCount = activeAttendanceLogs.filter((l) => l.attendanceStatus === "LATE").length;

    // Thống kê theo từng sinh viên & đánh giá chuyên cần
    const studentStats = students.map((sv) => {
      const logs = sv.dutySchedules
        .map((s) => s.attendanceLog)
        .filter((l): l is NonNullable<typeof l> => l !== null);
      const totalHours = getUniqueAttendanceHours(logs);
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
        fullName: getStudentDisplayName(sv.fullName),
        studentCode: sv.studentCode,
        profileStatus: sv.profileStatus,
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

    // Phân bổ số giờ theo ngày làm việc trong tuần của VLU (Thứ Hai -> Thứ Bảy; Chủ Nhật nghỉ)
    const weekdayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const weekdayMap: { [key: string]: number } = {
      "Thứ Hai": 0,
      "Thứ Ba": 0,
      "Thứ Tư": 0,
      "Thứ Năm": 0,
      "Thứ Sáu": 0,
      "Thứ Bảy": 0,
    };

    // Phân bổ giờ theo ca làm việc chuẩn VLU (Ca Sáng: 08:00 - 11:30, Ca Chiều: 13:00 - 17:00)
    let morningHours = 0;
    let afternoonHours = 0;

    for (const logs of Array.from(activeLogsByStudent.values())) {
      for (const interval of getUniqueAttendanceIntervals(logs)) {
        let cursor = new Date(interval.start);
        while (cursor < interval.end) {
          const nextDay = new Date(cursor);
          nextDay.setHours(24, 0, 0, 0);
          const daySegmentEnd = interval.end < nextDay ? interval.end : nextDay;
          const dayName = weekdayNames[cursor.getDay()];
          if (weekdayMap[dayName] !== undefined) {
            weekdayMap[dayName] += (daySegmentEnd.getTime() - cursor.getTime()) / 3_600_000;
          }

          const noon = new Date(cursor);
          noon.setHours(12, 0, 0, 0);
          if (cursor < noon) {
            const morningEnd = daySegmentEnd < noon ? daySegmentEnd : noon;
            morningHours += (morningEnd.getTime() - cursor.getTime()) / 3_600_000;
            if (daySegmentEnd > noon) afternoonHours += (daySegmentEnd.getTime() - noon.getTime()) / 3_600_000;
          } else {
            afternoonHours += (daySegmentEnd.getTime() - cursor.getTime()) / 3_600_000;
          }
          cursor = daySegmentEnd;
        }
      }
    }

    const weekdayData = Object.entries(weekdayMap).map(([day, hours]) => ({
      day,
      hours: Math.round(hours * 10) / 10,
    }));

    const shiftDistribution = [
      { shift: "Ca Sáng (08:00 - 11:30)", hours: Math.round(morningHours * 10) / 10 },
      { shift: "Ca Chiều (13:00 - 17:00)", hours: Math.round(afternoonHours * 10) / 10 },
    ];

    // Danh sách sinh viên đang có mặt trong phòng Lab (Live)
    const activeInLab = attendanceLogs
      .filter((l) => l.checkInTime && !l.checkOutTime && l.dutySchedule.student.isActive)
      .map((l) => {
        const checkIn = new Date(l.checkInTime!);
        const elapsedSec = Math.max(1, Math.floor((Date.now() - checkIn.getTime()) / 1000));
        const h = Math.floor(elapsedSec / 3600);
        const m = Math.floor((elapsedSec % 3600) / 60);
        const duration = h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
        const isStale = h >= 4; // Cảnh báo nếu ở quá 4 tiếng (vượt khung ca làm việc VLU)

        return {
          id: l.id,
          studentName: getStudentDisplayName(l.dutySchedule.student.fullName),
          studentCode: l.dutySchedule.student.studentCode,
          profileStatus: l.dutySchedule.student.profileStatus,
          isPendingProfile: l.dutySchedule.student.profileStatus === "PENDING",
          isActive: l.dutySchedule.student.isActive,
          labName: l.dutySchedule.labRoom.labName,
          checkInTime: l.checkInTime,
          snapshot: l.checkInSnapshot,
          scanMethod: l.scanMethod,
          duration,
          isStale,
        };
      });

    const completedLogs = activeAttendanceLogs.filter((l) => l.checkInTime && l.checkOutTime);
    const uniqueCompletedPeriods = Array.from(activeLogsByStudent.values()).reduce((total, logs) => {
      const intervals = getUniqueAttendanceIntervals(logs);
      const legacyPeriods = logs.filter((log) => !log.checkInTime && log.totalHours > 0).length;
      return total + intervals.length + legacyPeriods;
    }, 0);
    const avgHours = uniqueCompletedPeriods > 0
      ? Math.round((totalHoursAll / uniqueCompletedPeriods) * 10) / 10
      : 0;
    const completionRate = activeAttendanceLogs.length > 0
      ? Math.round((completedLogs.length / activeAttendanceLogs.length) * 100)
      : 100;
    const staleCount = activeInLab.filter((s) => s.isStale).length;

    return NextResponse.json({
      success: true,
      stats: {
        totalSchedules,
        totalLogs: activeAttendanceLogs.length,
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
          studentName: getStudentDisplayName(l.dutySchedule.student.fullName),
          studentCode: l.dutySchedule.student.studentCode,
          profileStatus: l.dutySchedule.student.profileStatus,
          isPendingProfile: l.dutySchedule.student.profileStatus === "PENDING",
          isActive: l.dutySchedule.student.isActive,
          deactivatedAt: l.dutySchedule.student.deactivatedAt,
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

    const normalizedStudentCode = getValidStudentCode(studentCode);
    if (!normalizedStudentCode) return NextResponse.json({ success: false, message: "MSSV phải gồm đúng 13 chữ số." }, { status: 400 });

    const student = await prisma.student.findUnique({
      where: { studentCode: normalizedStudentCode },
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
      message: `Đã ghi nhận điểm danh bổ sung cho sinh viên ${getStudentDisplayName(student.fullName)}!`,
      logId: newLog.id,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

