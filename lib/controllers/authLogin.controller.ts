import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

const LEGACY_SEED_HASH = "$2a$12$K8y4P9Q8y9qGg4.x0G2m4.bL2yB8x6fQ7cT2s7G5k3sP1u6t2A8Qy";

export async function handleAuthLogin(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (typeof identifier !== "string" || !identifier.trim() || typeof password !== "string" || !password) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập Email / MSSV và Mật khẩu!" },
        { status: 400 }
      );
    }
    if (identifier.length > 190 || password.length > 128) {
      return NextResponse.json({ success: false, message: "Thông tin đăng nhập vượt quá độ dài cho phép." }, { status: 400 });
    }

    const cleanId = identifier.trim();

    // Tìm kiếm sinh viên / quản trị viên / máy trạm theo email hoặc mã
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanId.toLowerCase() },
          { studentCode: cleanId },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Tài khoản hoặc MSSV không tồn tại trên hệ thống!" },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: "Tài khoản này hiện đang bị khóa. Vui lòng liên hệ Quản trị viên phòng Lab!" },
        { status: 403 }
      );
    }

    // Upgrade the fixed legacy seed credential after its documented demo password is used.
    const isLegacySeedLogin = user.passwordHash === LEGACY_SEED_HASH && password === "123456";
    const isValidPass = isLegacySeedLogin || await verifyPassword(password, user.passwordHash);
    if (!isValidPass) {
      return NextResponse.json(
        { success: false, message: "Mật khẩu không chính xác!" },
        { status: 401 }
      );
    }

    if (isLegacySeedLogin) {
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
    }

    const userData = {
      id: user.id,
      studentCode: user.studentCode,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phone: user.phone,
    };

    const response = NextResponse.json({
      success: true,
      message: `Đăng nhập thành công với vai trò ${user.role}!`,
      user: userData,
    });

    // Thiết lập cookie xác thực
    response.cookies.set("vlu_user_session", JSON.stringify(userData), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 ngày
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Lỗi đăng nhập:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ khi đăng nhập: " + error.message },
      { status: 500 }
    );
  }
}
