import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUniqueAttendanceHours } from "@/lib/attendance-hours";
import { getStudentDisplayName } from "@/lib/student-display";
import { getValidStudentCode } from "@/lib/studentCode";
import { getStudentProfileStatus } from "@/lib/student-profile";

async function getSessionUser(req: NextRequest) {
  try {
    const session = req.cookies.get("vlu_user_session")?.value;
    const userId = session ? JSON.parse(session)?.id : null;
    if (!userId) return null;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isActive: true } });
    return user?.isActive ? user : null;
  } catch {
    return null;
  }
}

function formatStudent(sv: any) {
  const logs = sv.dutySchedules.map((s: any) => s.attendanceLog).filter(Boolean);
  const displayName = getStudentDisplayName(sv.fullName);
  const profile = {
    fullName: displayName === "Chưa có tên" ? null : displayName,
    email: sv.email,
    phone: sv.phone,
    className: sv.className,
  };
  return {
    id: sv.id, studentCode: sv.studentCode, fullName: profile.fullName, email: sv.email,
    phone: sv.phone, className: sv.className, profileStatus: getStudentProfileStatus(profile),
    source: sv.source, firstSeenAt: sv.firstSeenAt, isActive: sv.isActive,
    deactivatedAt: sv.deactivatedAt, reactivatedAt: sv.reactivatedAt,
    totalShifts: sv.dutySchedules.length,
    completedShifts: logs.filter((l: any) => l.checkOutTime !== null).length,
    totalHours: Math.round(getUniqueAttendanceHours(logs) * 10) / 10,
    studentCodeInvalid: !getValidStudentCode(sv.studentCode),
    hasAttendanceLogs: logs.length > 0,
    createdAt: sv.createdAt,
  };
}

export async function handleStudentsGet(req: NextRequest) {
  try {
    const activity = req.nextUrl.searchParams.get("activity") || "ACTIVE";
    const where = activity === "ALL" ? {} : { isActive: activity !== "INACTIVE" };
    const students = await prisma.student.findMany({
      where,
      orderBy: [{ profileStatus: "asc" }, { createdAt: "desc" }],
      include: { dutySchedules: { include: { shift: true, labRoom: true, attendanceLog: true } } },
    });
    const [activeCount, inactiveCount, studentsForProfileCount] = await Promise.all([
      prisma.student.count({ where: { isActive: true } }),
      prisma.student.count({ where: { isActive: false } }),
      prisma.student.findMany({
        where: { isActive: true },
        select: { fullName: true, email: true, phone: true, className: true },
      }),
    ]);
    const pendingCount = studentsForProfileCount.filter(
      (student) => getStudentProfileStatus(student) === "PENDING"
    ).length;
    // The student directory must remain available while a running dev server is
    // holding an older generated Prisma client without the RejectedScan delegate.
    const rejectedScanDelegate = (prisma as any).rejectedScan;
    const rejectedScans = typeof rejectedScanDelegate?.findMany === "function"
      ? await rejectedScanDelegate.findMany({
          where: { reason: "INACTIVE_STUDENT" }, orderBy: { scannedAt: "desc" }, take: 50,
          include: { student: { select: { id: true, studentCode: true, fullName: true, isActive: true } } },
        })
      : [];
    return NextResponse.json({
      success: true, students: students.map(formatStudent), summary: { activeCount, inactiveCount, pendingCount },
      rejectedScans: rejectedScans.map((scan) => ({
        ...scan,
        student: scan.student ? { ...scan.student, fullName: getStudentDisplayName(scan.student.fullName) } : null,
        restoreAvailable: Boolean(scan.student && !scan.student.isActive),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function handleStudentsPost(req: NextRequest) {
  try {
    const body = await req.json();
    const rawStudentCode = typeof body?.studentCode === "string" ? body.studentCode : "";
    const studentCode = getValidStudentCode(rawStudentCode) || "";
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const className = typeof body?.className === "string" ? body.className.trim() : "";
    if (!rawStudentCode || !fullName) return NextResponse.json({ success: false, message: "Vui lòng nhập đầy đủ MSSV và Họ và tên sinh viên!" }, { status: 400 });
    if (!studentCode) return NextResponse.json({ success: false, message: "MSSV phải gồm đúng 13 chữ số!" }, { status: 400 });

    const existing = await prisma.student.findUnique({ where: { studentCode } });
    if (existing?.isActive === false) {
      return NextResponse.json({ success: false, code: "INACTIVE_STUDENT", studentId: existing.id, message: `MSSV ${studentCode} đã có hồ sơ bị ngừng hoạt động.` }, { status: 409 });
    }
    if (existing && getStudentProfileStatus(existing) === "PENDING") {
      const profile = { fullName, email, phone, className };
      const profileStatus = getStudentProfileStatus(profile);
      const student = await prisma.student.update({
        where: { id: existing.id },
        data: { fullName, email: email || null, phone: phone || null, className: className || null, profileStatus },
      });
      const message = profileStatus === "VERIFIED"
        ? `Đã cập nhật và xác minh hồ sơ sinh viên ${student.fullName} (${student.studentCode})!`
        : `Đã cập nhật hồ sơ sinh viên ${student.studentCode}. Hồ sơ chưa xác minh.`;
      return NextResponse.json({ success: true, message, student });
    }
    if (existing) return NextResponse.json({ success: false, message: `Sinh viên với MSSV ${studentCode} đã tồn tại trong danh sách!` }, { status: 409 });

    const profile = { fullName, email, phone, className };
    const profileStatus = getStudentProfileStatus(profile);
    const student = await prisma.student.create({
      data: { studentCode, fullName, email: email || null, phone: phone || null, className: className || null, profileStatus, source: "MANUAL", isActive: true },
    });
    const message = profileStatus === "VERIFIED"
      ? `Đã thêm và xác minh sinh viên ${student.fullName} (${student.studentCode})!`
      : `Đã thêm sinh viên ${student.studentCode}. Hồ sơ chưa xác minh.`;
    return NextResponse.json({ success: true, message, student });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function handleStudentsPatch(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) return NextResponse.json({ success: false, message: "Vui lòng đăng nhập để cập nhật hồ sơ." }, { status: 401 });
    const body = await req.json();
    const id = typeof body?.id === "string" ? body.id : "";
    if (typeof body?.studentCode === "string" && !getValidStudentCode(body.studentCode)) {
      return NextResponse.json({ success: false, message: "MSSV phải gồm đúng 13 chữ số." }, { status: 400 });
    }
    if (!id) return NextResponse.json({ success: false, message: "Thiếu ID sinh viên cần khôi phục." }, { status: 400 });
    if (body.restore && sessionUser.role !== "ADMIN") return NextResponse.json({ success: false, message: "Chỉ quản trị viên mới có thể khôi phục hồ sơ." }, { status: 403 });
    const studentBeforeUpdate = await prisma.student.findUnique({ where: { id } });
    if (!studentBeforeUpdate) return NextResponse.json({ success: false, message: "Không tìm thấy sinh viên." }, { status: 404 });
    const profile = {
      fullName: typeof body.fullName === "string" ? body.fullName.trim() || null : studentBeforeUpdate.fullName,
      className: typeof body.className === "string" ? body.className.trim() || null : studentBeforeUpdate.className,
      email: typeof body.email === "string" ? body.email.trim().toLowerCase() || null : studentBeforeUpdate.email,
      phone: typeof body.phone === "string" ? body.phone.trim() || null : studentBeforeUpdate.phone,
    };
    const profileStatus = getStudentProfileStatus(profile);
    const student = await prisma.student.update({ where: { id }, data: {
      ...(body.restore ? { isActive: true, reactivatedAt: new Date(), deactivatedAt: null } : {}),
      ...(typeof body.fullName === "string" ? { fullName: profile.fullName } : {}),
      ...(typeof body.className === "string" ? { className: profile.className } : {}),
      ...(typeof body.email === "string" ? { email: profile.email } : {}),
      ...(typeof body.phone === "string" ? { phone: profile.phone } : {}),
      profileStatus,
    } });
    const message = body.restore
      ? `Đã khôi phục hồ sơ ${student.studentCode}${profileStatus === "PENDING" ? ", hồ sơ chưa xác minh." : "."}`
      : profileStatus === "VERIFIED"
        ? `Đã cập nhật và xác minh hồ sơ ${student.studentCode}.`
        : `Đã cập nhật hồ sơ ${student.studentCode}. Hồ sơ chưa xác minh.`;
    return NextResponse.json({ success: true, message, student });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function handleStudentsDelete(req: NextRequest) {
  try {
    const admin = await getSessionUser(req);
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ success: false, message: "Chỉ quản trị viên mới có thể ngừng hoặc xóa hồ sơ." }, { status: 403 });
    const body = await req.json();
    const id = typeof body?.id === "string" ? body.id : "";
    const hardDelete = body?.hardDelete === true;
    if (!id) return NextResponse.json({ success: false, message: "Thiếu ID sinh viên cần xử lý." }, { status: 400 });
    const student = await prisma.student.findUnique({ where: { id }, include: { dutySchedules: { include: { attendanceLog: true } } } });
    if (!student) return NextResponse.json({ success: false, message: "Không tìm thấy sinh viên." }, { status: 404 });
    const logs = student.dutySchedules.map((s) => s.attendanceLog).filter(Boolean);
    if (hardDelete) {
      if (getValidStudentCode(student.studentCode) || logs.length) {
        return NextResponse.json({ success: false, message: "Chỉ hồ sơ có MSSV không hợp lệ và chưa có lượt điểm danh mới được xóa vĩnh viễn." }, { status: 409 });
      }
      const referencedIncidents = await prisma.equipmentIncident.count({ where: { OR: [{ reportedByStudentId: id }, { schedule: { studentId: id } }] } });
      if (referencedIncidents) return NextResponse.json({ success: false, message: "Hồ sơ có sự cố thiết bị liên quan nên không thể xóa để bảo toàn lịch sử." }, { status: 409 });
      await prisma.$transaction(async (tx) => {
        await tx.dutySchedule.deleteMany({ where: { studentId: id } });
        await tx.student.delete({ where: { id } });
      });
      return NextResponse.json({ success: true, message: "Đã xóa vĩnh viễn hồ sơ có MSSV không hợp lệ." });
    }
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      for (const schedule of student.dutySchedules) {
        const log = schedule.attendanceLog;
        if (log?.checkInTime && !log.checkOutTime) {
          const totalHours = Math.round(Math.max(0, now.getTime() - log.checkInTime.getTime()) / 36000) / 100;
          await tx.attendanceLog.update({ where: { id: log.id }, data: { checkOutTime: now, totalHours } });
          await tx.dutySchedule.update({ where: { id: schedule.id }, data: { scheduleStatus: "COMPLETED", note: "Đóng ca do ngừng hoạt động" } });
        }
      }
      await tx.student.update({ where: { id }, data: { isActive: false, deactivatedAt: now, deactivatedBy: admin.id } });
    });
    return NextResponse.json({ success: true, message: "Đã ngừng hoạt động hồ sơ sinh viên; lịch sử được giữ nguyên." });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
