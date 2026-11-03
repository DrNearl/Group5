import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export async function handleAuthSignup(req: NextRequest) {
  try {
    const body = await req.json();
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const studentCode = typeof body.studentCode === "string" ? body.studentCode.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role = body.role;

    if (!fullName || !studentCode || !email || !password || !role) {
      return NextResponse.json({ success: false, message: "Vui lòng điền đầy đủ các trường bắt buộc." }, { status: 400 });
    }
    if (role !== "LECTURER" && role !== "STUDENT") {
      return NextResponse.json({ success: false, message: "Chỉ sinh viên và giảng viên có thể đăng ký." }, { status: 403 });
    }
    if (fullName.length > 120 || studentCode.length < 4 || studentCode.length > 32) {
      return NextResponse.json({ success: false, message: "Họ tên hoặc mã tài khoản không đúng định dạng." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) {
      return NextResponse.json({ success: false, message: "Vui lòng nhập email hợp lệ." }, { status: 400 });
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ success: false, message: "Mật khẩu cần có từ 8 đến 128 ký tự." }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        fullName,
        studentCode,
        email,
        passwordHash: await hashPassword(password),
        role,
        isActive: true,
      },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        email: true,
        role: true,
        phone: true,
      },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ success: false, message: "Mã tài khoản hoặc email đã được đăng ký." }, { status: 409 });
    }
    console.error("POST /api/auth/signup error:", error);
    return NextResponse.json({ success: false, message: "Không thể tạo tài khoản lúc này. Vui lòng thử lại." }, { status: 500 });
  }
}
