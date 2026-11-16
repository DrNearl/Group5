import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/auth-server";
import { hashPassword, verifyPassword } from "@/lib/password";
import { recordAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth(req);
  if (!("user" in auth)) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "Mật khẩu mới phải có ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { id: true, passwordHash: true, fullName: true, username: true },
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, message: "Không tìm thấy tài khoản." }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!valid) {
      return NextResponse.json({ success: false, message: "Mật khẩu hiện tại không đúng." }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { passwordHash: newHash },
    });

    await recordAuditLog({
      actor: auth.user,
      action: "PASSWORD_CHANGE",
      target: `${dbUser.fullName} (${dbUser.username})`,
      detail: "Tự đổi mật khẩu tài khoản trong Cài đặt",
    });

    return NextResponse.json({ success: true, message: "Đổi mật khẩu thành công!" });
  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể đổi mật khẩu: " + error.message },
      { status: 500 }
    );
  }
}
