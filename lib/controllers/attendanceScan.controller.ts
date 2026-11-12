import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseVluStudentInfo } from "@/lib/vlu-student-helper";
import { verifyPersonalQrToken } from "@/lib/qr-security";
const AttendanceStatus = {
  ON_TIME: "ON_TIME",
  LATE: "LATE",
  EARLY_LEAVE: "EARLY_LEAVE",
  MISSING_CHECKOUT: "MISSING_CHECKOUT",
} as const;

const ScanMethod = {
  USB_SCANNER: "USB_SCANNER",
  WEBCAM: "WEBCAM",
  DYNAMIC_QR: "DYNAMIC_QR",
} as const;

const ScheduleStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  COMPLETED: "COMPLETED",
  ABSENT: "ABSENT",
} as const;

// API Xử lý Điểm danh Check-in / Check-out Tự do vào - ra phòng Lab
export async function handleAttendanceScan(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      barcode,
      scanMethod = "USB_SCANNER",
      snapshotBase64 = null,
      labId = null,
    } = body;

    if (!barcode || typeof barcode !== "string") {
      return NextResponse.json(
        { success: false, message: "Dữ liệu Barcode không hợp lệ hoặc rỗng!" },
        { status: 400 }
      );
    }

    const cleanBarcode = barcode.trim();
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

    // =========================================================================
    // 1. NẾU QUÉT TRÚNG MÃ EQ- (ĐÃ BỎ DATA MÁY TRẠM)
    // =========================================================================
    if (cleanBarcode.toUpperCase().startsWith("EQ-")) {
      return NextResponse.json({
        success: false,
        message: "Trạm quét chỉ phục vụ điểm danh thẻ sinh viên!",
      });
    }

    // =========================================================================
    // 2. ĐIỂM DANH SINH VIÊN (CHECK-IN / CHECK-OUT PHÒNG LAB)
    // Hỗ trợ Thẻ Sinh Viên (Barcode/MSSV) VÀ Thẻ QR Cá Nhân có chữ ký HMAC (VLUQR:...)
    // =========================================================================
    const isPersonalQr = cleanBarcode.startsWith("VLUQR:");
    let resolvedBarcode = cleanBarcode;
    let student = null;

    if (isPersonalQr) {
      const qrCheck = verifyPersonalQrToken(cleanBarcode);
      if (!qrCheck.valid || !qrCheck.payload) {
        return NextResponse.json(
          { success: false, message: qrCheck.error || "Mã QR cá nhân không hợp lệ!" },
          { status: 403 }
        );
      }

      student = await prisma.student.findUnique({
        where: { studentCode: qrCheck.payload.studentCode },
      });

      if (!student) {
        return NextResponse.json(
          { success: false, message: "Mã QR không thuộc sinh viên nào trong hệ thống!" },
          { status: 404 }
        );
      }
      if (!student.isActive) {
        return NextResponse.json(
          { success: false, message: "Tài khoản sinh viên này đang bị khóa!" },
          { status: 403 }
        );
      }
      if (student.qrVersion !== qrCheck.payload.qrVersion) {
        return NextResponse.json(
          {
            success: false,
            message: "Mã QR này đã bị thu hồi! Vui lòng sử dụng Thẻ QR mới nhất đã được cấp.",
          },
          { status: 403 }
        );
      }

      resolvedBarcode = student.studentCode;
    } else {
      // Tìm hoặc tự động tạo hồ sơ Sinh viên nếu quét thẻ cứng MSSV lần đầu
      student = await prisma.student.findUnique({
        where: { studentCode: cleanBarcode },
      });

      if (!student) {
        // Tự động phân tích niên khóa K27 - K32 hoặc khách ngoài theo MSSV Văn Lang
        const vluInfo = parseVluStudentInfo(cleanBarcode);
        student = await prisma.student.create({
          data: {
            studentCode: cleanBarcode,
            fullName: vluInfo.defaultFullName,
            email: vluInfo.defaultEmail,
            className: vluInfo.suggestedClass,
            isActive: true,
          },
        });
      }
    }

    // Lấy thông tin phòng Lab thực tế
    let targetLab = labId ? await prisma.labRoom.findUnique({ where: { id: labId } }) : null;
    if (!targetLab) {
      targetLab = await prisma.labRoom.findFirst({
        where: { labCode: "LAB-CS3-G801" },
      });
      if (!targetLab) {
        targetLab = await prisma.labRoom.findFirst();
      }
    }

    if (!targetLab) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phòng Lab hợp lệ trong hệ thống!" },
        { status: 404 }
      );
    }

    // Khung giờ mặc định
    let defaultShift = await prisma.shift.findFirst();
    if (!defaultShift) {
      defaultShift = await prisma.shift.create({
        data: {
          shiftName: "Thực hành phòng Lab",
          startTime: "07:00",
          endTime: "21:30",
          gracePeriodMinutes: 30,
        },
      });
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // KIỂM TRA XEM SINH VIÊN ĐANG CÓ LƯỢT CHECK-IN CHƯA CHECK-OUT KHÔNG
    const openLog = await prisma.attendanceLog.findFirst({
      where: {
        scannedBarcode: resolvedBarcode,
        checkOutTime: null,
      },
      include: {
        dutySchedule: {
          include: { labRoom: true, student: true, shift: true },
        },
      },
      orderBy: { checkInTime: "desc" },
    });

    // -------------------------------------------------------------------------
    // TRƯỜNG HỢP A: ĐÃ CHECK-IN TRƯỚC ĐÓ -> BÂY GIỜ THỰC HIỆN CHECK-OUT
    // Sinh viên có thể Check-out bất kỳ lúc nào, ghi nhận thời gian chính xác!
    // -------------------------------------------------------------------------
    if (openLog && openLog.checkInTime) {
      const checkInDate = new Date(openLog.checkInTime);
      const diffMs = now.getTime() - checkInDate.getTime();

      // Chống quẹt nhầm Check-out sớm trong vòng 20 giây sau khi Check-in
      if (diffMs < 20000) {
        const remainingSec = Math.ceil((20000 - diffMs) / 1000);
        return NextResponse.json({
          success: false,
          type: "COOLDOWN_WAIT",
          student: {
            fullName: student.fullName,
            studentCode: student.studentCode,
          },
          message: `Bạn vừa Check-in lúc ${checkInDate.toLocaleTimeString("vi-VN")}! Vui lòng đợi ${remainingSec} giây trước khi Check-out.`,
        });
      }

      // Tính chính xác Giờ - Phút - Giây có mặt tại phòng Lab
      const totalSeconds = Math.max(1, Math.floor(diffMs / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      let durationText = "";
      if (hours > 0) {
        durationText = `${hours} giờ ${minutes} phút ${seconds} giây`;
      } else if (minutes > 0) {
        durationText = `${minutes} phút ${seconds} giây`;
      } else {
        durationText = `${seconds} giây`;
      }

      const totalHours = Math.round((diffMs / 3600000) * 100) / 100;

      const updatedLog = await prisma.attendanceLog.update({
        where: { id: openLog.id },
        data: {
          checkOutTime: now,
          checkOutSnapshot: snapshotBase64 || openLog.checkOutSnapshot,
          totalHours: totalHours,
          attendanceStatus: AttendanceStatus.ON_TIME,
        },
      });

      // Đánh dấu lịch trực hoàn thành
      await prisma.dutySchedule.update({
        where: { id: openLog.scheduleId },
        data: { scheduleStatus: ScheduleStatus.COMPLETED },
      });

      return NextResponse.json({
        success: true,
        type: "STUDENT_ATTENDANCE",
        action: "CHECK_OUT",
        status: AttendanceStatus.ON_TIME,
        message: `Check-out thành công lúc ${now.toLocaleTimeString("vi-VN")}! Tổng thời gian có mặt: ${durationText}.`,
        data: {
          logId: updatedLog.id,
          studentName: student.fullName,
          studentCode: student.studentCode,
          labName: openLog.dutySchedule.labRoom.labName,
          shiftName: "Check-out phòng Lab",
          checkInTime: checkInDate.toISOString(),
          checkOutTime: now.toISOString(),
          totalHours: totalHours,
          durationText: durationText,
          attendanceStatus: AttendanceStatus.ON_TIME,
          scanMethod: scanMethod,
          snapshot: snapshotBase64 || openLog.checkInSnapshot,
        },
      });
    }

    // -------------------------------------------------------------------------
    // TRƯỜNG HỢP B: CHƯA CHECK-IN -> THỰC HIỆN CHECK-IN VÀO PHÒNG LAB
    // -------------------------------------------------------------------------
    
    // Tạo bản ghi Schedule gắn với lượt điểm danh
    const newSchedule = await prisma.dutySchedule.create({
      data: {
        studentId: student.id,
        labId: targetLab.id,
        shiftId: defaultShift.id,
        dutyDate: today,
        scheduleStatus: ScheduleStatus.APPROVED,
        note: isPersonalQr ? "Điểm danh bằng Thẻ QR cá nhân" : "Điểm danh vào phòng Lab",
      },
    });

    const newLog = await prisma.attendanceLog.create({
      data: {
        scheduleId: newSchedule.id,
        scannedBarcode: resolvedBarcode,
        checkInTime: now,
        scanMethod: scanMethod === "WEBCAM" ? ScanMethod.WEBCAM : ScanMethod.USB_SCANNER,
        checkInSnapshot: snapshotBase64,
        clientIp: clientIp,
        attendanceStatus: AttendanceStatus.ON_TIME,
      },
    });

    return NextResponse.json({
      success: true,
      type: "STUDENT_ATTENDANCE",
      action: "CHECK_IN",
      status: AttendanceStatus.ON_TIME,
      message: `Check-in thành công vào phòng Lab lúc ${now.toLocaleTimeString("vi-VN")}!`,
      data: {
        logId: newLog.id,
        studentName: student.fullName,
        studentCode: student.studentCode,
        labName: targetLab.labName,
        shiftName: "Check-in phòng Lab",
        checkInTime: now.toISOString(),
        checkOutTime: null,
        totalHours: 0,
        attendanceStatus: AttendanceStatus.ON_TIME,
        scanMethod: scanMethod,
        snapshot: snapshotBase64,
      },
    });
  } catch (error: any) {
    console.error("API /api/attendance/scan Error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi xử lý máy chủ: " + (error?.message || "Internal Server Error") },
      { status: 500 }
    );
  }
}

// GET: Lấy danh sách nhật ký quét gần đây trong ngày và danh sách phòng Lab
export async function GET(req: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [recentLogs, labRooms, activeShifts, activeAttendanceLogs] = await Promise.all([
      prisma.attendanceLog.findMany({
        where: {
          createdAt: { gte: today },
        },
        include: {
          dutySchedule: {
            include: {
              student: true,
              labRoom: true,
              shift: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 25,
      }),
      prisma.labRoom.findMany({
        where: { status: "ACTIVE" },
        orderBy: { labCode: "asc" },
      }),
      prisma.shift.findMany({
        orderBy: { startTime: "asc" },
      }),
      prisma.attendanceLog.findMany({
        where: {
          checkInTime: { gte: today },
          checkOutTime: null,
        },
        include: {
          dutySchedule: {
            include: {
              student: { select: { id: true, fullName: true, studentCode: true } },
              labRoom: { select: { labCode: true } },
            },
          },
        },
        orderBy: { checkInTime: "asc" },
      }),
    ]);

    const formattedLogs = recentLogs.map((log) => {
      let durationText = "--";
      if (log.checkInTime && log.checkOutTime) {
        const diffSeconds = Math.max(
          1,
          Math.floor((new Date(log.checkOutTime).getTime() - new Date(log.checkInTime).getTime()) / 1000)
        );
        const h = Math.floor(diffSeconds / 3600);
        const m = Math.floor((diffSeconds % 3600) / 60);
        const s = diffSeconds % 60;
        if (h > 0) durationText = `${h} giờ ${m} phút ${s} giây`;
        else if (m > 0) durationText = `${m} phút ${s} giây`;
        else durationText = `${s} giây`;
      } else if (log.checkInTime && !log.checkOutTime) {
        const diffSeconds = Math.max(
          1,
          Math.floor((new Date().getTime() - new Date(log.checkInTime).getTime()) / 1000)
        );
        const m = Math.floor(diffSeconds / 60);
        durationText = m > 0 ? `Đang có mặt (${m} phút)` : "Đang có mặt";
      }

      return {
        id: log.id,
        studentName: log.dutySchedule.student.fullName,
        studentCode: log.dutySchedule.student.studentCode,
        labCode: log.dutySchedule.labRoom.labCode,
        labName: log.dutySchedule.labRoom.labName,
        shiftName: log.dutySchedule.shift.shiftName,
        checkInTime: log.checkInTime,
        checkOutTime: log.checkOutTime,
        scanMethod: log.scanMethod,
        attendanceStatus: log.attendanceStatus,
        totalHours: log.totalHours,
        durationText,
        snapshot: log.checkInSnapshot,
      };
    });

    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      activeStudents: activeAttendanceLogs.map((log) => ({
        id: log.id,
        studentId: log.dutySchedule.student.id,
        studentName: log.dutySchedule.student.fullName,
        studentCode: log.dutySchedule.student.studentCode,
        labCode: log.dutySchedule.labRoom.labCode,
        checkInTime: log.checkInTime,
        attendanceStatus: log.attendanceStatus,
      })),
      labs: labRooms,
      shifts: activeShifts,
    });
  } catch (error: any) {
    console.error("GET /api/attendance/scan Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// Giảng viên / Quản lý Check-out thủ công nếu sinh viên quên quẹt thẻ lúc ra về
export async function handleManualCheckout(req: NextRequest) {
  try {
    const { logId } = await req.json();
    if (!logId) {
      return NextResponse.json({ success: false, message: "Thiếu logId!" }, { status: 400 });
    }

    const log = await prisma.attendanceLog.findUnique({
      where: { id: logId },
      include: { dutySchedule: { include: { student: true } } },
    });

    if (!log || log.checkOutTime) {
      return NextResponse.json({ success: false, message: "Không tìm thấy lượt trực hoặc đã check-out rồi!" }, { status: 404 });
    }

    const now = new Date();
    const checkIn = new Date(log.checkInTime || now);
    const diffMs = Math.max(1000, now.getTime() - checkIn.getTime());
    const totalHours = Math.round((diffMs / 3600000) * 100) / 100;

    await prisma.attendanceLog.update({
      where: { id: logId },
      data: {
        checkOutTime: now,
        totalHours,
        attendanceStatus: AttendanceStatus.ON_TIME,
      },
    });

    await prisma.dutySchedule.update({
      where: { id: log.scheduleId },
      data: { scheduleStatus: ScheduleStatus.COMPLETED },
    });

    return NextResponse.json({
      success: true,
      message: `Đã kết thúc lượt trực cho sinh viên ${log.dutySchedule.student.fullName}!`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

