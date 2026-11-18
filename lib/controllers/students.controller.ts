import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseVluStudentInfo } from "@/lib/vlu-student-helper";
import { requireStaffAuth } from "@/lib/auth-server";
import { generatePersonalQrToken } from "@/lib/qr-security";
import { sendPersonalQrEmail } from "@/lib/mailer";
import { recordAuditLog } from "@/lib/audit";
import { randomBytes } from "node:crypto";
import { validateStudentInput } from "@/lib/student-validation";

function isPrismaUniqueError(error: any): boolean {
  return error?.code === "P2002";
}

async function duplicateStudentCodeResponse(studentCode: string) {
  let existingName = "";
  try {
    const existing = await prisma.student.findUnique({
      where: { studentCode },
      select: { fullName: true },
    });
    existingName = existing?.fullName || "";
  } catch {
    // Keep the client response safe even if the follow-up lookup also fails.
  }

  const errorMessage = existingName
    ? `Mã số ${studentCode} đã được dùng bởi ${existingName}.`
    : `Mã số ${studentCode} đã được sử dụng.`;
  return NextResponse.json(
    {
      success: false,
      message: "Vui lòng kiểm tra lại các ô được đánh dấu",
      errors: { studentCode: errorMessage },
    },
    { status: 409 }
  );
}

async function generateStudentCode(): Promise<string> {
  let candidate = "";
  let exists = true;
  while (exists) {
    candidate = `AUTO${randomBytes(8).toString("hex").toUpperCase()}`;
    exists = Boolean(await prisma.student.findUnique({ where: { studentCode: candidate }, select: { id: true } }));
  }
  return candidate;
}

// GET: Lấy danh sách toàn bộ đối tượng trong danh bạ phòng Lab (Sinh viên, Giảng viên, Khách)
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
        className: sv.className || "",
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
  let cleanCode = "";
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Dữ liệu gửi lên không hợp lệ" },
        { status: 400 }
      );
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu gửi lên không hợp lệ" },
        { status: 400 }
      );
    }

    const {
      studentCode,
      fullName,
      email,
      phone = "",
      className = "",
      sendQrEmail = false,
      ttlDays = 0,
    } = body;

    const errors = validateStudentInput({ studentCode, fullName, className, phone, email }, "create");
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, message: "Vui lòng kiểm tra lại các ô được đánh dấu", errors },
        { status: 400 }
      );
    }

    const cleanFullName = String(fullName).trim();
    cleanCode = typeof studentCode === "string" && studentCode.trim()
      ? studentCode.trim()
      : await generateStudentCode();
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const cleanPhone = typeof phone === "string" ? phone.trim() : "";
    const cleanClassName = typeof className === "string" ? className.trim() : "";
    const vluParsed = parseVluStudentInfo(cleanCode, cleanFullName);

    // Kiểm tra xem MSSV đã tồn tại chưa
    const existing = await prisma.student.findUnique({
      where: { studentCode: cleanCode },
    });

    if (existing) {
      return duplicateStudentCodeResponse(cleanCode);
    }

    let student = await prisma.student.create({
      data: {
        studentCode: cleanCode,
        fullName: cleanFullName,
        email: cleanEmail || vluParsed.defaultEmail,
        phone: cleanPhone || null,
        className: cleanClassName || vluParsed.suggestedClass,
        isActive: true,
      },
    });

    let emailResult = null;
    if (sendQrEmail && student.email) {
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
          className: student.className || "Chưa phân loại",
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
      detail: `${student.className ? `Lớp/Đối tượng: ${student.className}` : "Chưa phân loại"}${emailResult?.sent ? " • Đã gửi QR qua email" : ""}`,
    });

    return NextResponse.json({
      success: true,
      message:
        emailResult?.sent
          ? `Đã thêm ${student.fullName} và gửi Thẻ QR vào ${student.email}!`
          : `Đã thêm thành công ${student.fullName} (${student.studentCode})!`,
      student,
      emailResult,
    });
  } catch (error: any) {
    if (isPrismaUniqueError(error)) return duplicateStudentCodeResponse(cleanCode);
    console.error("POST /api/students error:", error);
    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi máy chủ, vui lòng thử lại" },
      { status: 500 }
    );
  }
}

// DELETE: Xóa khỏi danh sách
export async function handleStudentsDelete(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, message: "Thiếu ID cần xóa!" }, { status: 400 });
    }

    const deletedStudent = await prisma.student.delete({
      where: { id },
    });

    await recordAuditLog({
      req,
      action: "STUDENT_DELETE",
      target: `${deletedStudent.fullName} (${deletedStudent.studentCode})`,
      detail: `Xóa khỏi danh sách phòng Lab`,
    });

    return NextResponse.json({ success: true, message: "Đã xóa khỏi danh sách phòng Lab!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT: Cập nhật thông tin trực Lab
export async function handleStudentsPut(req: NextRequest) {
  let cleanCode = "";
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Dữ liệu gửi lên không hợp lệ" },
        { status: 400 }
      );
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu gửi lên không hợp lệ" },
        { status: 400 }
      );
    }

    const { id, studentCode, fullName, email, phone = "", className = "" } = body;
    if (typeof id !== "string" || !id.trim()) {
      return NextResponse.json({ success: false, message: "Thiếu ID bản ghi cần cập nhật!" }, { status: 400 });
    }

    const existingRecord = await prisma.student.findUnique({ where: { id } });
    if (!existingRecord) {
      return NextResponse.json({ success: false, message: "Không tìm thấy dữ liệu!" }, { status: 404 });
    }

    const errors = validateStudentInput({ studentCode, fullName, email, phone, className }, "edit");
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, message: "Vui lòng kiểm tra lại các ô được đánh dấu", errors },
        { status: 400 }
      );
    }

    cleanCode = studentCode.trim();
    const cleanFullName = fullName.trim();
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const cleanPhone = typeof phone === "string" ? phone.trim() : "";
    const cleanClassName = typeof className === "string" ? className.trim() : "";

    // Kiểm tra xem Mã số có bị trùng với người khác không
    const duplicate = await prisma.student.findFirst({
      where: {
        studentCode: cleanCode,
        NOT: { id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng kiểm tra lại các ô được đánh dấu",
          errors: { studentCode: `Mã số ${cleanCode} đã được dùng bởi ${duplicate.fullName || "Chưa có tên"}.` },
        },
        { status: 409 }
      );
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        studentCode: cleanCode,
        fullName: cleanFullName,
        email: cleanEmail || null,
        phone: cleanPhone || null,
        className: cleanClassName || null,
      },
    });

    await recordAuditLog({
      req,
      action: "STUDENT_UPDATE",
      target: `${updatedStudent.fullName} (${updatedStudent.studentCode})`,
      detail: `Cập nhật thông tin (${updatedStudent.className || "Chưa phân loại"})`,
    });

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật thông tin ${updatedStudent.fullName}!`,
      student: updatedStudent,
    });
  } catch (error: any) {
    if (isPrismaUniqueError(error)) return duplicateStudentCodeResponse(cleanCode);
    console.error("PUT /api/students error:", error);
    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi máy chủ, vui lòng thử lại" },
      { status: 500 }
    );
  }
}

