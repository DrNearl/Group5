import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function handleAuthMe(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("vlu_user_session");

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const parsed = JSON.parse(sessionCookie.value);
    const user = await prisma.user.findUnique({
      where: { id: parsed.id },
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

    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }
}
