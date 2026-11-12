import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseVluStudentInfo } from "@/lib/vlu-student-helper";
import { requireStaffAuth } from "@/lib/auth-server";
import { generatePersonalQrToken } from "@/lib/qr-security";
import { sendPersonalQrEmail } from "@/lib/mailer";
import { recordAuditLog } from "@/lib/audit";

// GET: Lấy danh sách toàn bộ Sinh viên trực Lab
export async function handleStudentsGet(req: NextRequest) {
  try {
    const students = await prisma.student.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        dutySchedules: {
          include: {
            shift: true,
            labRoom: true,
            attendanceLog: true,
          },
        },
      },
    });

    const formattedStudents = students.map((sv) => {
      const logs = sv.dutySchedules
        .map((s) => s.attendanceLog)
        .filter((l): l is NonNullable<typeof l> => l !== null);
      const totalHours = logs.reduce((acc, l) => acc + (l.totalHours || 0), 0);

      return {
        id: sv.id,
        studentCode: sv.studentCode,
        fullName: sv.fullName,
        email: sv.email,
        phone: sv.phone,
        className: sv.className || "DTH-CNTT",
        isActive: sv.isActive,
        qrVersion: sv.qrVersion,
        qrSentAt: sv.qrSentAt,
        totalShifts: sv.dutySchedules.length,
        completedShifts: logs.filter((l) => l.checkOutTime !== null).length,
        totalHours: Math.round(totalHours * 10) / 10,
        createdAt: sv.createdAt,
      };
    });

    return NextResponse.json({ success: true, students: formattedStudents });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Thêm mới Sinh viên trực Lab (dùng mã vạch thẻ SV, không cần tạo mật khẩu)
export async function handleStudentsPost(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      studentCode,
      fullName,
      email,
      phone = "",
      className = "",
      sendQrEmail = false,
      ttlDays = 0,
    } = body;

    if (!studentCode || !fullName) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập đầy đủ MSSV và Họ và tên sinh viên!" },
        { status: 400 }
      );
    }

    const cleanCode = studentCode.trim();
    const vluParsed = parseVluStudentInfo(cleanCode, fullName);

    // Kiểm tra xem MSSV đã tồn tại chưa
    const existing = await prisma.student.findUnique({
      where: { studentCode: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: `Sinh viên với MSSV ${cleanCode} đã tồn tại trong danh sách!` },
        { status: 409 }
      );
    }

    let student = await prisma.student.create({
      data: {
        studentCode: cleanCode,
        fullName: fullName.trim(),
        email: email ? email.trim().toLowerCase() : vluParsed.defaultEmail,
        phone: phone ? phone.trim() : null,
        className: className && className.trim() ? className.trim() : vluParsed.suggestedClass,
        isActive: true,
      },
    });

    let emailResult = null;
    if (sendQrEmail) {
      const auth = await requireStaffAuth(req);
      if (auth.authorized) {
        const { token, expiresAtSec } = generatePersonalQrToken(
          student.studentCode,
          student.qrVersion,
          Math.max(0, Number(ttlDays) || 0)
        );
        emailResult = await sendPersonalQrEmail({
          to: student.email,
          fullName: student.fullName,
          studentCode: student.studentCode,
          className: student.className,
          qrToken: token,
          qrVersion: student.qrVersion,
          expiresAtSec,
        });
        if (emailResult.sent) {
          student = await prisma.student.update({
            where: { id: student.id },
            data: { qrSentAt: new Date() },
          });
        }
      }
    }

    await recordAuditLog({
      req,
      action: "STUDENT_CREATE",
      target: `${student.fullName} (${student.studentCode})`,
      detail: `Lớp ${student.className || "DTH-CNTT"}${emailResult?.sent ? " • Đã gửi QR qua email" : ""}`,
    });

    return NextResponse.json({
      success: true,
      message:
        emailResult?.sent
          ? `Đã thêm sinh viên ${student.fullName} và gửi Thẻ QR vào ${student.email}!`
          : `Đã thêm thành công sinh viên ${student.fullName} (${student.studentCode})!`,
      student,
      emailResult,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE: Xóa sinh viên khỏi danh sách
export async function handleStudentsDelete(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, message: "Thiếu ID sinh viên cần xóa!" }, { status: 400 });
    }

    const deletedStudent = await prisma.student.delete({
      where: { id },
    });

    await recordAuditLog({
      req,
      action: "STUDENT_DELETE",
      target: `${deletedStudent.fullName} (${deletedStudent.studentCode})`,
      detail: `Xóa sinh viên khỏi danh sách phòng Lab`,
    });

    return NextResponse.json({ success: true, message: "Đã xóa sinh viên khỏi danh sách phòng Lab!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT: Cập nhật thông tin sinh viên trực Lab
export async function handleStudentsPut(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, studentCode, fullName, email, phone = "", className = "" } = body;

    if (!id || !studentCode || !fullName) {
      return NextResponse.json(
        { success: false, message: "Thiếu ID hoặc thông tin sinh viên bắt buộc!" },
        { status: 400 }
      );
    }

    const cleanCode = studentCode.trim();
    const vluParsed = parseVluStudentInfo(cleanCode, fullName);

    // Kiểm tra xem MSSV có bị trùng với sinh viên khác không
    const duplicate = await prisma.student.findFirst({
      where: {
        studentCode: cleanCode,
        NOT: { id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: `MSSV ${cleanCode} đã được dùng bởi sinh viên ${duplicate.fullName}!` },
        { status: 409 }
      );
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        studentCode: cleanCode,
        fullName: fullName.trim(),
        email: email ? email.trim().toLowerCase() : vluParsed.defaultEmail,
        phone: phone ? phone.trim() : null,
        className: className && className.trim() ? className.trim() : vluParsed.suggestedClass,
      },
    });

    await recordAuditLog({
      req,
      action: "STUDENT_UPDATE",
      target: `${updatedStudent.fullName} (${updatedStudent.studentCode})`,
      detail: `Cập nhật thông tin sinh viên (${updatedStudent.className || "DTH-CNTT"})`,
    });

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật thông tin sinh viên ${updatedStudent.fullName}!`,
      student: updatedStudent,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

