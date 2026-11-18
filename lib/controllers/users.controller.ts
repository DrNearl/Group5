import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { recordAuditLog } from "@/lib/audit";

export async function handleUsersGet(req: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      where: {
        username: { not: "admin" },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function handleUsersPost(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentCode, fullName, email, phone = "", role = "LECTURER", password = "admin" } = body;

    if (!studentCode || !fullName || !email) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập đầy đủ tên đăng nhập/mã, họ và tên và email!" },
        { status: 400 }
      );
    }

    const safeRole = "LECTURER";
    const userPassword = (password && password.trim().length > 0) ? password.trim() : "123456";

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: studentCode.trim(), mode: "insensitive" } },
          { email: { equals: email.trim(), mode: "insensitive" } },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Tên đăng nhập hoặc Email này đã tồn tại trong hệ thống!" },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        username: studentCode.trim(),
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        passwordHash: await hashPassword(userPassword),
        phone,
        role: safeRole,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    await recordAuditLog({
      req,
      action: "USER_CREATE",
      target: `${user.fullName} (${user.username})`,
      detail: `Tạo tài khoản mới • Vai trò: ${user.role}`,
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, message: "Tên đăng nhập hoặc Email này đã tồn tại trong hệ thống!" },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function handleUsersDelete(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Thiếu ID người dùng!" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ success: false, message: "Không tìm thấy người dùng!" }, { status: 404 });
    }

    if (existingUser.username === "admin") {
      return NextResponse.json(
        { success: false, message: "Không thể xóa tài khoản Quản trị viên gốc (admin)!" },
        { status: 403 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    await recordAuditLog({
      req,
      action: "USER_DELETE",
      target: `${existingUser.fullName} (${existingUser.username})`,
      detail: `Xóa tài khoản (${existingUser.role})`,
    });

    return NextResponse.json({ success: true, message: "Đã xóa người dùng thành công!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function handleUsersPatch(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isActive } = body;

    if (!id || typeof isActive !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Thiếu ID hoặc trạng thái hợp lệ!" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng!" },
        { status: 404 }
      );
    }

    if (existingUser.username === "admin") {
      return NextResponse.json(
        { success: false, message: "Không thể thay đổi trạng thái Quản trị viên gốc!" },
        { status: 403 }
      );
    }

    const isApproveFromPending = isActive && existingUser.role === "PENDING";
    const updateData: { isActive: boolean; role?: string } = { isActive };
    if (isApproveFromPending) {
      updateData.role = "LECTURER";
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    const isUnlock = isActive && !isApproveFromPending;
    const auditDetail = isApproveFromPending
      ? "Duyệt kích hoạt tài khoản đăng ký mới"
      : isUnlock
      ? "Mở khóa tài khoản"
      : "Tạm khóa tài khoản";

    await recordAuditLog({
      req,
      action: isActive ? "USER_APPROVE" : "USER_DEACTIVATE",
      target: `${updatedUser.fullName} (${updatedUser.username})`,
      detail: auditDetail,
    });

    const successMessage = isApproveFromPending
      ? "Đã duyệt và kích hoạt tài khoản thành công!"
      : isUnlock
      ? "Đã mở khóa tài khoản thành công!"
      : "Đã tạm khóa tài khoản!";

    return NextResponse.json({
      success: true,
      message: successMessage,
      user: updatedUser,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
