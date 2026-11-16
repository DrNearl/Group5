import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { AuthorizedUser, requireStaffAuth } from "@/lib/auth-server";

export type AuditAction =
  | "QR_REISSUE"
  | "QR_SEND_EMAIL"
  | "MANUAL_ATTENDANCE"
  | "FORCE_CHECKOUT"
  | "STUDENT_CREATE"
  | "STUDENT_UPDATE"
  | "STUDENT_DELETE"
  | "STUDENT_IMPORT"
  | "USER_CREATE"
  | "USER_DELETE"
  | "PASSWORD_CHANGE";

interface RecordAuditLogParams {
  req?: NextRequest;
  actor?: AuthorizedUser | null;
  action: AuditAction;
  target: string;
  detail?: string;
}

/**
 * Ghi nhận nhật ký thao tác quản trị. Lỗi ghi log không làm gián đoạn thao tác chính.
 */
export async function recordAuditLog({
  req,
  actor,
  action,
  target,
  detail,
}: RecordAuditLogParams): Promise<void> {
  try {
    let resolvedActor = actor ?? null;
    if (!resolvedActor && req) {
      const auth = await requireStaffAuth(req);
      if (auth.authorized) {
        resolvedActor = auth.user;
      }
    }

    await prisma.auditLog.create({
      data: {
        actorId: resolvedActor?.id ?? null,
        actorName: resolvedActor ? resolvedActor.fullName || resolvedActor.username : "Hệ thống",
        actorRole: resolvedActor?.role ?? "SYSTEM",
        action,
        target,
        detail: detail ?? null,
      },
    });
  } catch (err) {
    console.error("AuditLog error:", err);
  }
}
