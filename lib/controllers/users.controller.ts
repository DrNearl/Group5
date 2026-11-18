import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { recordAuditLog } from "@/lib/audit";
import { requireStaffAuth } from "@/lib/auth-server";
import { translations } from "@/lib/i18n";

const USER_ROLES = ["ADMIN", "LECTURER"] as const;
type ManagedRole = (typeof USER_ROLES)[number];

function getLocale(req: NextRequest) {
  return req.headers.get("x-vlu-language") === "en" ? "en" : "vi";
}

function getUserMessages(req: NextRequest) {
  return translations[getLocale(req)].users;
}

async function requireAdmin(req: NextRequest) {
  const auth = await requireStaffAuth(req);
  if (auth.authorized === false) {
    const messages = getUserMessages(req).api;
    const message = auth.status === 401
      ? messages.authRequired
      : auth.status === 403
        ? messages.adminRequired
        : messages.serverError;
    return NextResponse.json({ success: false, message }, { status: auth.status });
  }
  if (auth.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, message: getUserMessages(req).api.adminRequired },
      { status: 403 }
    );
  }
  return null;
}

function isManagedRole(value: unknown): value is ManagedRole {
  return typeof value === "string" && USER_ROLES.includes(value as ManagedRole);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

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
    const authResponse = await requireAdmin(req);
    if (authResponse) return authResponse;

    const messages = getUserMessages(req).api;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: messages.invalidJson }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: messages.invalidJson }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;
    const username = normalizeText(payload.studentCode);
    const name = normalizeText(payload.fullName);
    const email = normalizeText(payload.email).toLowerCase();
    const phone = payload.phone == null ? "" : normalizeText(payload.phone);
    const role = payload.role === undefined ? "LECTURER" : payload.role;

    if (!username) {
      return NextResponse.json({ success: false, message: messages.usernameRequired }, { status: 400 });
    }
    if (username.length > 64) {
      return NextResponse.json({ success: false, message: messages.usernameInvalid }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ success: false, message: messages.fullNameRequired }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json({ success: false, message: messages.fullNameInvalid }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ success: false, message: messages.emailRequired }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: messages.emailInvalid }, { status: 400 });
    }
    if (typeof payload.phone !== "undefined" && payload.phone !== null && typeof payload.phone !== "string") {
      return NextResponse.json({ success: false, message: messages.phoneInvalid }, { status: 400 });
    }
    if (phone.length > 30) {
      return NextResponse.json({ success: false, message: messages.phoneInvalid }, { status: 400 });
    }
    if (!isManagedRole(role)) {
      return NextResponse.json({ success: false, message: messages.roleInvalid }, { status: 400 });
    }

    const password = payload.password === undefined ? "admin" : payload.password;
    const userPassword = typeof password === "string" && password.trim().length > 0
      ? password.trim()
      : "123456";

    const user = await prisma.user.create({
      data: {
        username,
        fullName: name,
        email,
        passwordHash: await hashPassword(userPassword),
        phone,
        role,
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
      detail: getUserMessages(req).createAuditDetail.replace(
        "{role}",
        user.role === "ADMIN" ? getUserMessages(req).roleAdmin : getUserMessages(req).roleLecturer
      ),
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, message: getUserMessages(req).api.duplicateAccount },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: getUserMessages(req).api.serverError },
      { status: 500 }
    );
  }
}

export async function handleUsersPatch(req: NextRequest) {
  const localeMessages = getUserMessages(req);
  const messages = localeMessages.api;

  try {
    const authResponse = await requireAdmin(req);
    if (authResponse) return authResponse;

    const id = new URL(req.url).searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ success: false, message: messages.accountNotFound }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: messages.invalidJson }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: messages.invalidJson }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;
    const name = normalizeText(payload.fullName);
    const email = normalizeText(payload.email).toLowerCase();
    const phone = payload.phone == null ? "" : normalizeText(payload.phone);
    const role = payload.role;

    if (!name) {
      return NextResponse.json({ success: false, message: messages.fullNameRequired }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json({ success: false, message: messages.fullNameInvalid }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ success: false, message: messages.emailRequired }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: messages.emailInvalid }, { status: 400 });
    }
    if (typeof payload.phone !== "undefined" && payload.phone !== null && typeof payload.phone !== "string") {
      return NextResponse.json({ success: false, message: messages.phoneInvalid }, { status: 400 });
    }
    if (phone.length > 30) {
      return NextResponse.json({ success: false, message: messages.phoneInvalid }, { status: 400 });
    }
    if (!isManagedRole(role)) {
      return NextResponse.json({ success: false, message: messages.roleInvalid }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ success: false, message: messages.accountNotFound }, { status: 404 });
    }
    if (existingUser.username === "admin") {
      return NextResponse.json({ success: false, message: messages.protectedAccount }, { status: 403 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { fullName: name, email, phone, role },
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

    const roleName = (value: string) => value === "ADMIN" ? localeMessages.roleAdmin : localeMessages.roleLecturer;
    const detail = messages.auditEditDetail
      .replace("{previousRole}", roleName(existingUser.role))
      .replace("{newRole}", roleName(user.role));
    await recordAuditLog({
      req,
      action: "USER_UPDATE",
      target: `${user.fullName} (${user.username})`,
      detail,
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ success: false, message: messages.duplicateAccount }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: messages.serverError }, { status: 500 });
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
