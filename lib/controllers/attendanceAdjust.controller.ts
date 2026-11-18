import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { requireAdminAuth } from "@/lib/auth-server";
import { formatLabTime, getLabDateKey, LAB_TIMEZONE, MAX_SESSION_HOURS } from "@/lib/attendance-rules";

function isValidSession(log: {
  checkInTime: Date | null;
  checkOutTime: Date | null;
  attendanceStatus: string;
}): boolean {
  if (!log.checkInTime || !log.checkOutTime || log.attendanceStatus === "MISSING_CHECKOUT") {
    return false;
  }

  const checkInTime = new Date(log.checkInTime);
  const checkOutTime = new Date(log.checkOutTime);
  const durationMs = checkOutTime.getTime() - checkInTime.getTime();
  return (
    durationMs >= 0 &&
    durationMs <= MAX_SESSION_HOURS * 60 * 60 * 1000 &&
    getLabDateKey(checkInTime) === getLabDateKey(checkOutTime)
  );
}

function formatAuditDateTime(date: Date): string {
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LAB_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(date);
  const parts = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
  return `${formatLabTime(date)} ${parts.day}/${parts.month}`;
}

export async function handleAttendanceAdjustPatch(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminAuth(req);
  if (!("user" in auth)) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json().catch(() => null);
    const checkOutTimeValue = body?.checkOutTime;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (typeof checkOutTimeValue !== "string" || !checkOutTimeValue.trim()) {
      return NextResponse.json({ success: false, message: "Vui lòng chọn giờ ra hợp lệ." }, { status: 400 });
    }
    if (reason.length < 5 || reason.length > 300) {
      return NextResponse.json({ success: false, message: "Lý do phải có từ 5 đến 300 ký tự." }, { status: 400 });
    }

    const isoParts = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(checkOutTimeValue);
    const checkOutTime = new Date(checkOutTimeValue);
    const calendarDate = isoParts
      ? new Date(Date.UTC(Number(isoParts[1]), Number(isoParts[2]) - 1, Number(isoParts[3])))
      : null;
    const hasValidCalendarDate = Boolean(
      isoParts && calendarDate &&
      calendarDate.getUTCFullYear() === Number(isoParts[1]) &&
      calendarDate.getUTCMonth() === Number(isoParts[2]) - 1 &&
      calendarDate.getUTCDate() === Number(isoParts[3])
    );
    if (!isoParts || !hasValidCalendarDate || Number.isNaN(checkOutTime.getTime())) {
      return NextResponse.json({ success: false, message: "Giờ ra không đúng định dạng ISO." }, { status: 400 });
    }

    const log = await prisma.attendanceLog.findUnique({
      where: { id: params.id },
      include: { dutySchedule: { include: { student: true } } },
    });
    if (!log) {
      return NextResponse.json({ success: false, message: "Không tìm thấy lượt điểm danh." }, { status: 404 });
    }

    if (isValidSession(log)) {
      return NextResponse.json({ success: false, message: "Lượt này đã hợp lệ, không cần sửa giờ ra." }, { status: 400 });
    }
    if (!log.checkInTime) {
      return NextResponse.json({ success: false, message: "Lượt này không có giờ vào để đối chiếu." }, { status: 400 });
    }

    const checkInTime = new Date(log.checkInTime);
    if (checkOutTime.getTime() <= checkInTime.getTime()) {
      return NextResponse.json({ success: false, message: "Giờ ra phải sau giờ vào." }, { status: 400 });
    }
    if (getLabDateKey(checkOutTime) !== getLabDateKey(checkInTime)) {
      return NextResponse.json({ success: false, message: "Giờ ra phải cùng ngày Lab với giờ vào." }, { status: 400 });
    }
    if (checkOutTime.getTime() > Date.now()) {
      return NextResponse.json({ success: false, message: "Giờ ra không được ở tương lai." }, { status: 400 });
    }

    const durationMs = checkOutTime.getTime() - checkInTime.getTime();
    if (durationMs > MAX_SESSION_HOURS * 60 * 60 * 1000) {
      return NextResponse.json({ success: false, message: `Thời lượng không được vượt quá ${MAX_SESSION_HOURS} giờ.` }, { status: 400 });
    }

    const totalHours = Math.round((durationMs / 3600000) * 100) / 100;
    await prisma.attendanceLog.update({
      where: { id: log.id },
      data: {
        checkOutTime,
        totalHours,
        attendanceStatus: "ADJUSTED",
      },
    });

    const student = log.dutySchedule.student;
    await recordAuditLog({
      req,
      actor: auth.user,
      action: "ATTENDANCE_ADJUST",
      target: log.id,
      detail: [
        `MSSV: ${student.studentCode}`,
        `Giờ ra: ${log.checkOutTime ? formatAuditDateTime(new Date(log.checkOutTime)) : "chưa có"} → ${formatAuditDateTime(checkOutTime)}`,
        `Lý do: ${reason}`,
      ].join(" • "),
    });

    return NextResponse.json({ success: true, message: "Đã cập nhật giờ ra cho lượt điểm danh." });
  } catch (error: any) {
    console.error("PATCH /api/attendance/logs/[id] error:", error);
    return NextResponse.json({ success: false, message: "Không thể sửa giờ ra: " + error.message }, { status: 500 });
  }
}
