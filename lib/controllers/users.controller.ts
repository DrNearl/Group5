import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export async function handleUsersGet(req: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: "desc" },
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
    const { studentCode, fullName, email, phone = "", role = "LECTURER" } = body;

    if (!studentCode || !fullName || !email) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập đầy đủ mã, họ và tên và email!" },
        { status: 400 }
      );
    }

    const safeRole = role === "ADMIN" ? "ADMIN" : "LECTURER";

    const user = await prisma.user.create({
      data: {
        username: studentCode.trim(),
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        passwordHash: await hashPassword("123456"),
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
        { success: false, message: "MSSV hoặc Email này đã tồn tại trong hệ thống!" },
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

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Đã xóa người dùng thành công!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
