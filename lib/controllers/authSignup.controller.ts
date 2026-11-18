import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { recordAuditLog } from "@/lib/audit";

export async function handleAuthSignup(req: NextRequest) {
  try {
    const body = await req.json();
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const studentCode = typeof body.studentCode === "string" ? body.studentCode.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role = body.role || "LECTURER";

    if (!fullName || !studentCode || !email || !password) {
      return NextResponse.json({ success: false, message: "Vui lòng điền đầy đủ các trường bắt buộc." }, { status: 400 });
    }
    if (fullName.length > 120 || studentCode.length < 4 || studentCode.length > 32) {
      return NextResponse.json({ success: false, message: "Họ tên hoặc mã tài khoản không đúng định dạng." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) {
      return NextResponse.json({ success: false, message: "Vui lòng nhập email hợp lệ." }, { status: 400 });
    }
    if (password.length < 6 || password.length > 128) {
      return NextResponse.json({ success: false, message: "Mật khẩu cần có từ 6 đến 128 ký tự." }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        fullName,
        username: studentCode,
        email,
        phone,
        passwordHash: await hashPassword(password),
        role: "PENDING", // Đánh dấu tài khoản đăng ký đang chờ xét duyệt
        isActive: false, // Chưa kích hoạt
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
      },
    });

    await recordAuditLog({
      req,
      action: "USER_REGISTER_REQUEST",
      target: `${user.fullName} (${user.username})`,
      detail: `Gửi yêu cầu đăng ký tài khoản (Chờ Admin duyệt)`,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Đăng ký thành công! Tài khoản của bạn đang chờ Quản trị viên (Admin) xét duyệt trước khi sử dụng.",
        user,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ success: false, message: "Mã tài khoản hoặc email đã được đăng ký." }, { status: 409 });
    }
    console.error("POST /api/auth/signup error:", error);
    return NextResponse.json({ success: false, message: "Không thể tạo tài khoản lúc này. Vui lòng thử lại." }, { status: 500 });
  }
}
