import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyQrSessionToken } from "@/lib/qr-security";
import { verifyVluLocation } from "@/lib/geo-security";
import { ScanMethod, AttendanceStatus, ScheduleStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function handleQrVerify(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, studentCode, clientNote, latitude, longitude, deviceId } = body;

    if (!token || !studentCode) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã xác thực QR hoặc Mã số sinh viên!" },
        { status: 400 }
      );
    }

    // 1. Xác thực tính hợp lệ và thời hạn của Token mã QR
    const verification = verifyQrSessionToken(token);
    if (!verification.valid || !verification.payload) {
      return NextResponse.json(
        {
          success: false,
          code: "QR_EXPIRED_OR_INVALID",
          message: verification.error || "Mã QR không hợp lệ hoặc đã hết hạn!",
        },
        { status: 403 }
      );
    }

    // 2. Ghi nhận vị trí GPS tại Cơ sở chính Đại học Văn Lang (Giải pháp 1)
    const locationCheck = verifyVluLocation(latitude, longitude);

    const { labCode } = verification.payload;
    const cleanStudentCode = studentCode.trim();

    // 3. Tra cứu sinh viên theo MSSV trong cơ sở dữ liệu
    const student = await prisma.student.findFirst({
      where: { studentCode: cleanStudentCode },
    });

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          code: "STUDENT_NOT_FOUND",
          message: `Không tìm thấy sinh viên với MSSV "${cleanStudentCode}" trong hệ thống! Vui lòng kiểm tra lại.`,
        },
        { status: 404 }
      );
    }

    // 4. Ràng buộc 1 thiết bị chỉ điểm danh cho 1 sinh viên trong ngày
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (deviceId) {
      const deviceUsedLog = await prisma.dutySchedule.findFirst({
        where: {
          dutyDate: { gte: today },
          note: { contains: `[Device: ${deviceId}]` },
          studentId: { not: student.id }, // Đã từng dùng cho sinh viên khác
        },
        include: { student: true },
      });

      if (deviceUsedLog && deviceUsedLog.student) {
        return NextResponse.json(
          {
            success: false,
            code: "DEVICE_ALREADY_USED_FOR_ANOTHER_STUDENT",
            message: `Thiết bị này đã được sử dụng để điểm danh cho sinh viên khác (${deviceUsedLog.student.fullName} - MSSV: ${deviceUsedLog.student.studentCode}) trong hôm nay. Mỗi điện thoại chỉ được dùng cho 1 sinh viên, không thể điểm danh hộ!`,
          },
          { status: 403 }
        );
      }
    }

    // 5. Lấy thông tin phòng Lab
    let targetLab = await prisma.labRoom.findFirst({
      where: {
        OR: [{ labCode }, { labCode: "LAB-CS3-G801" }],
      },
    });

    if (!targetLab) {
      targetLab = await prisma.labRoom.findFirst();
    }

    if (!targetLab) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phòng Lab hợp lệ trên hệ thống!" },
        { status: 404 }
      );
    }

    // Khung giờ mặc định
    let defaultShift = await prisma.shift.findFirst();
    if (!defaultShift) {
      defaultShift = await prisma.shift.create({
        data: {
          shiftName: "Ca Trực Lab Mặc Định",
          startTime: "07:30",
          endTime: "17:30",
        },
      });
    }

    const now = new Date();

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    // 4. KIỂM TRA XEM SINH VIÊN ĐÃ CHECK-IN CHƯA (Lấy lượt điểm danh chưa check-out)
    const openLog = await prisma.attendanceLog.findFirst({
      where: {
        scannedBarcode: cleanStudentCode,
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
    // -------------------------------------------------------------------------
    if (openLog && openLog.checkInTime) {
      const checkInDate = new Date(openLog.checkInTime);
      const diffMs = now.getTime() - checkInDate.getTime();

      // Tính chính xác thời gian có mặt
      const totalSeconds = Math.max(1, Math.floor(diffMs / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      let durationText = `${seconds} giây`;
      if (hours > 0) {
        durationText = `${hours} giờ ${minutes} phút ${seconds} giây`;
      } else if (minutes > 0) {
        durationText = `${minutes} phút ${seconds} giây`;
      }

      const totalHours = Math.round((diffMs / 3600000) * 100) / 100;

      const updatedLog = await prisma.attendanceLog.update({
        where: { id: openLog.id },
        data: {
          checkOutTime: now,
          totalHours,
          attendanceStatus: AttendanceStatus.ON_TIME,
        },
      });

      await prisma.dutySchedule.update({
        where: { id: openLog.scheduleId },
        data: { scheduleStatus: ScheduleStatus.COMPLETED },
      });

      return NextResponse.json({
        success: true,
        action: "CHECK_OUT",
        status: AttendanceStatus.ON_TIME,
        message: `Check-out thành công lúc ${now.toLocaleTimeString("vi-VN")}! Tổng thời gian có mặt: ${durationText}.`,
        data: {
          logId: updatedLog.id,
          studentName: student.fullName,
          studentCode: student.studentCode,
          labName: targetLab.labName,
          checkInTime: checkInDate.toISOString(),
          checkOutTime: now.toISOString(),
          totalHours,
          durationText,
          scanMethod: "DYNAMIC_QR",
        },
      });
    }

    // -------------------------------------------------------------------------
    // TRƯỜNG HỢP B: CHƯA CHECK-IN -> THỰC HIỆN CHECK-IN VÀO PHÒNG LAB
    // -------------------------------------------------------------------------
    const deviceTag = deviceId ? `[Device: ${deviceId}]` : "";
    const distanceTag =
      locationCheck.distanceMeters >= 0
        ? `[GPS: cách ${locationCheck.formattedDistance}${locationCheck.isValid ? " - Trong khuôn viên" : " - Ngoại vi"}]`
        : "[GPS: Chưa xác định]";
    const fullNote = `Điểm danh QR di động ${deviceTag} ${distanceTag} ${clientNote ? `(${clientNote})` : ""}`.trim();

    const newSchedule = await prisma.dutySchedule.create({
      data: {
        studentId: student.id,
        labId: targetLab.id,
        shiftId: defaultShift.id,
        dutyDate: today,
        scheduleStatus: ScheduleStatus.APPROVED,
        note: fullNote,
      },
    });

    const newLog = await prisma.attendanceLog.create({
      data: {
        scheduleId: newSchedule.id,
        scannedBarcode: cleanStudentCode,
        checkInTime: now,
        scanMethod: ScanMethod.DYNAMIC_QR,
        attendanceStatus: AttendanceStatus.ON_TIME,
        clientIp,
      },
    });

    return NextResponse.json({
      success: true,
      action: "CHECK_IN",
      status: AttendanceStatus.ON_TIME,
      message: `Check-in thành công lúc ${now.toLocaleTimeString("vi-VN")}! Chúc bạn ca trực hiệu quả.`,
      data: {
        logId: newLog.id,
        studentName: student.fullName,
        studentCode: student.studentCode,
        labName: targetLab.labName,
        checkInTime: now.toISOString(),
        checkOutTime: null,
        durationText: "Vừa mới vào phòng Lab",
        scanMethod: "DYNAMIC_QR",
        distanceMeters: locationCheck.distanceMeters,
        formattedDistance: locationCheck.formattedDistance,
      },
    });
  } catch (error: any) {
    console.error("Lỗi xác thực QR verify:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ khi xử lý điểm danh: " + error.message },
      { status: 500 }
    );
  }
}
