import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

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

    return NextResponse.json({ success: true, message: "Đã xóa người dùng thành công!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
