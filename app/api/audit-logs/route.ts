import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  const auth = await requireStaffAuth(req);
  if (!("user" in auth)) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }
  if (auth.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, message: "Chỉ Quản trị viên (Admin) mới được xem nhật ký thao tác." },
      { status: 403 }
    );
  }

  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error("GET /api/audit-logs error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải nhật ký thao tác: " + error.message },
      { status: 500 }
    );
  }
}
