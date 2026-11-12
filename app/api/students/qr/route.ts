import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/auth-server";
import { generatePersonalQrToken } from "@/lib/qr-security";
import { generateQrImageAssets, sendPersonalQrEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

/**
 * GET /api/students/qr?studentId=...&ttlDays=0
 * Lấy ảnh QR PNG (dataUrl) + token cá nhân của 1 sinh viên (chỉ Admin/Giảng viên).
 */
export async function GET(req: NextRequest) {
  const auth = await requireStaffAuth(req);
  if (!("user" in auth)) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  try {
    const studentId = (req.nextUrl.searchParams.get("studentId") || "").trim();
    const ttlDays = Math.max(0, Number(req.nextUrl.searchParams.get("ttlDays") || "0") || 0);

    if (!studentId) {
      return NextResponse.json({ success: false, message: "Thiếu studentId!" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ success: false, message: "Không tìm thấy sinh viên!" }, { status: 404 });
    }

    const { token, expiresAtSec } = generatePersonalQrToken(
      student.studentCode,
      student.qrVersion,
      ttlDays
    );
    const assets = await generateQrImageAssets(token);

    return NextResponse.json({
      success: true,
      qrToken: token,
      qrDataUrl: assets.dataUrl,
      qrVersion: student.qrVersion,
      qrSentAt: student.qrSentAt,
      expiresAtSec,
      student: {
        id: student.id,
        studentCode: student.studentCode,
        fullName: student.fullName,
        email: student.email,
        className: student.className,
        qrVersion: student.qrVersion,
        qrSentAt: student.qrSentAt,
      },
    });
  } catch (error: any) {
    console.error("QR GET error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi tạo mã QR: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/students/qr
 * Body: { studentId, action: "SEND_EMAIL" | "REISSUE", ttlDays?: number, sendEmail?: boolean }
 * Chỉ Admin / Giảng viên mới có quyền gửi mail hoặc thu hồi & cấp lại mã QR mới.
 */
export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth(req);
  if (!("user" in auth)) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const studentId = String(body?.studentId || "").trim();
    const action = String(body?.action || "SEND_EMAIL").toUpperCase();
    const ttlDays = Math.max(0, Number(body?.ttlDays || 0) || 0);
    const shouldSendEmail = action === "SEND_EMAIL" || Boolean(body?.sendEmail);

    if (!studentId) {
      return NextResponse.json({ success: false, message: "Thiếu studentId!" }, { status: 400 });
    }

    let student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ success: false, message: "Không tìm thấy sinh viên!" }, { status: 404 });
    }

    if (action === "REISSUE") {
      student = await prisma.student.update({
        where: { id: studentId },
        data: { qrVersion: { increment: 1 } },
      });
    }

    const { token, expiresAtSec } = generatePersonalQrToken(
      student.studentCode,
      student.qrVersion,
      ttlDays
    );
    const assets = await generateQrImageAssets(token);

    if (shouldSendEmail) {
      const emailResult = await sendPersonalQrEmail({
        to: student.email,
        fullName: student.fullName,
        studentCode: student.studentCode,
        className: student.className,
        qrToken: token,
        qrVersion: student.qrVersion,
        expiresAtSec,
      });

      if (emailResult.sent) {
        student = await prisma.student.update({
          where: { id: student.id },
          data: { qrSentAt: new Date() },
        });
      }

      return NextResponse.json({
        success: true,
        qrToken: token,
        qrDataUrl: assets.dataUrl,
        qrVersion: student.qrVersion,
        qrSentAt: student.qrSentAt,
        expiresAtSec,
        emailResult,
        message:
          action === "REISSUE"
            ? `Đã cấp lại QR v${student.qrVersion} (${emailResult.sent ? "đã gửi email" : emailResult.message})`
            : emailResult.message,
      });
    }

    return NextResponse.json({
      success: true,
      qrToken: token,
      qrDataUrl: assets.dataUrl,
      qrVersion: student.qrVersion,
      qrSentAt: student.qrSentAt,
      expiresAtSec,
      message: `Đã thu hồi mã cũ và cấp lại Thẻ QR mới (v${student.qrVersion})!`,
    });
  } catch (error: any) {
    console.error("QR POST error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi xử lý Thẻ QR: " + error.message },
      { status: 500 }
    );
  }
}
