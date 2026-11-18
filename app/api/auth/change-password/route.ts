import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/auth-server";
import { hashPassword, verifyPassword } from "@/lib/password";
import { recordAuditLog } from "@/lib/audit";
import { translations } from "@/lib/i18n";

export async function POST(req: NextRequest) {
  const locale = req.headers.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : "vi";
  const messages = translations[locale].passwordDialog;
  const auth = await requireStaffAuth(req);
  if (!("user" in auth)) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: messages.requiredFields },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: messages.tooShort },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { id: true, passwordHash: true, username: true },
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, message: messages.accountNotFound }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!valid) {
      return NextResponse.json({ success: false, message: messages.wrongCurrentPassword }, { status: 400 });
    }
    if (newPassword === currentPassword) {
      return NextResponse.json({ success: false, message: messages.sameAsCurrent }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { passwordHash: newHash },
    });

    await recordAuditLog({
      actor: auth.user,
      action: "PASSWORD_CHANGE",
      target: dbUser.username,
    });

    return NextResponse.json({ success: true, message: messages.success });
  } catch {
    return NextResponse.json(
      { success: false, message: messages.requestFailed },
      { status: 500 }
    );
  }
}
