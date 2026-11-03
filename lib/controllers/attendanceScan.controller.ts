import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AttendanceStatus, ScanMethod, ScheduleStatus } from "@prisma/client";

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
    // 1. NẾU QUÉT TRÚNG MÃ THIẾT BỊ PHÒNG LAB (Bắt đầu bằng "EQ-")
    // =========================================================================
    if (cleanBarcode.toUpperCase().startsWith("EQ-")) {
      const equipment = await prisma.labEquipment.findUnique({
        where: { equipmentBarcode: cleanBarcode },
        include: {
          labRoom: true,
          incidents: {
            where: { incidentStatus: { in: ["OPEN", "IN_PROGRESS"] } },
            orderBy: { createdAt: "desc" },
            take: 3,
          },
        },
      });

      if (!equipment) {
        return NextResponse.json({
          success: false,
          type: "EQUIPMENT_NOT_FOUND",
          message: `Không tìm thấy thiết bị nào mang mã vạch: "${cleanBarcode}"!`,
        });
      }

      return NextResponse.json({
        success: true,
        type: "EQUIPMENT",
        message: `Đã nhận diện: ${equipment.equipmentName} (${equipment.labRoom.labName})`,
        data: {
          id: equipment.id,
          equipmentBarcode: equipment.equipmentBarcode,
          equipmentName: equipment.equipmentName,
          category: equipment.category,
          status: equipment.status,
          labName: equipment.labRoom.labName,
          building: equipment.labRoom.building,
          specifications: equipment.specifications,
          activeIncidents: equipment.incidents,
        },
      });
    }

    // =========================================================================
    // 2. ĐIỂM DANH SINH VIÊN (CHECK-IN / CHECK-OUT PHÒNG LAB)
    // Không ép buộc phải đăng ký ca trực trước!
    // =========================================================================
    
    // Tìm hoặc tự động tạo tài khoản Sinh viên nếu chưa có
    let user = await prisma.user.findUnique({
      where: { studentCode: cleanBarcode },
    });

    if (!user) {
      // Tự động tạo hồ sơ cho sinh viên quét lần đầu
      user = await prisma.user.create({
        data: {
          studentCode: cleanBarcode,
          fullName: `Sinh viên VLU (${cleanBarcode})`,
          email: `${cleanBarcode}@vanlanguni.vn`,
          passwordHash: "$2a$12$K8y4P9Q8y9qGg4.x0G2m4.bL2yB8x6fQ7cT2s7G5k3sP1u6t2A8Qy",
          role: "STUDENT",
          isActive: true,
        },
      });
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
        scannedBarcode: cleanBarcode,
        checkOutTime: null,
      },
      include: {
        dutySchedule: {
          include: { labRoom: true, user: true, shift: true },
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

      // Chỉ chặn nếu quét 2 lần liên tiếp dưới 1.5 giây (tránh camera bắt đúp 1 khung hình trong cùng 1 lần đưa thẻ)
      if (diffMs < 1500) {
        return NextResponse.json({
          success: false,
          type: "DEBOUNCE_WAIT",
          student: {
            fullName: user.fullName,
            studentCode: user.studentCode,
          },
          message: `Vừa quét xong! Vui lòng giữ thẻ cách camera một chút trước khi quét lại để Check-out.`,
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
          studentName: user.fullName,
          studentCode: user.studentCode,
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
        userId: user.id,
        labId: targetLab.id,
        shiftId: defaultShift.id,
        dutyDate: today,
        scheduleStatus: ScheduleStatus.APPROVED,
        note: "Điểm danh vào phòng Lab",
      },
    });

    const newLog = await prisma.attendanceLog.create({
      data: {
        scheduleId: newSchedule.id,
        scannedBarcode: cleanBarcode,
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
        studentName: user.fullName,
        studentCode: user.studentCode,
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
              user: true,
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
              user: { select: { id: true, fullName: true, studentCode: true } },
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
        studentName: log.dutySchedule.user.fullName,
        studentCode: log.dutySchedule.user.studentCode,
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
        studentId: log.dutySchedule.user.id,
        studentName: log.dutySchedule.user.fullName,
        studentCode: log.dutySchedule.user.studentCode,
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
