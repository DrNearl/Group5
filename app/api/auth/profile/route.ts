import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/auth-server";
import { recordAuditLog } from "@/lib/audit";
import { translations } from "@/lib/i18n";

function getMessages(req: NextRequest) {
  const locale = req.headers.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : "vi";
  return translations[locale].profileDialog;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function normalizePhone(phone: string) {
  return phone.replace(/[\s().-]/g, "");
}

function isValidVietnamPhone(phone: string) {
  return /^(?:0(?:[35789]\d{8}|2\d{8,9})|\+?84(?:[35789]\d{8}|2\d{8,9}))$/.test(phone);
}

function publicProfile(user: {
  username: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
}) {
  return {
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

export async function GET(req: NextRequest) {
  const messages = getMessages(req);
  const auth = await requireStaffAuth(req);
  if (!("user" in auth)) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { username: true, fullName: true, email: true, phone: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, message: messages.accountNotFound }, { status: 404 });
    }
    return NextResponse.json({ success: true, user: publicProfile(user) });
  } catch {
    return NextResponse.json({ success: false, message: messages.loadFailed }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const messages = getMessages(req);
  const auth = await requireStaffAuth(req);
  if (!("user" in auth)) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const phoneInput = typeof body?.phone === "string" ? body.phone.trim() : body?.phone == null ? "" : "invalid";
    const phone = normalizePhone(phoneInput);

    if (!fullName) {
      return NextResponse.json({ success: false, message: messages.nameRequired }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: messages.invalidEmail }, { status: 400 });
    }
    if (phone && !isValidVietnamPhone(phone)) {
      return NextResponse.json({ success: false, message: messages.invalidPhone }, { status: 400 });
    }

    const existingUsers = await prisma.user.findMany({
      where: { id: { not: auth.user.id } },
      select: { email: true },
    });
    if (existingUsers.some((user) => user.email.trim().toLowerCase() === email)) {
      return NextResponse.json({ success: false, message: messages.emailTaken }, { status: 409 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        fullName,
        email,
        phone: phone || null,
      },
      select: { username: true, fullName: true, email: true, phone: true, role: true },
    });

    await recordAuditLog({
      actor: auth.user,
      action: "USER_UPDATE",
      target: updatedUser.username,
      detail: messages.auditDetail,
    });

    return NextResponse.json({ success: true, user: publicProfile(updatedUser), message: messages.success });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ success: false, message: messages.emailTaken }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: messages.saveFailed }, { status: 500 });
  }
}
