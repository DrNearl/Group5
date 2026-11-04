import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
    const { studentCode, fullName, email, phone = "", className = "23DTH01" } = body;

    if (!studentCode || !fullName) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập đầy đủ MSSV và Họ và tên sinh viên!" },
        { status: 400 }
      );
    }

    const cleanCode = studentCode.trim();

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

    const student = await prisma.student.create({
      data: {
        studentCode: cleanCode,
        fullName: fullName.trim(),
        email: email ? email.trim().toLowerCase() : `${cleanCode}@vanlanguni.vn`,
        phone: phone ? phone.trim() : null,
        className: className ? className.trim() : "23DTH01",
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã thêm thành công sinh viên ${student.fullName} (${student.studentCode})!`,
      student,
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

    await prisma.student.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Đã xóa sinh viên khỏi danh sách trực Lab!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
