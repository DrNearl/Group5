"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  Clock3,
  LogIn,
  QrCode,
  UserRound,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type AttendanceLog = {
  id: string;
  studentCode: string;
  dutyDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  totalHours: number;
  durationText: string;
  attendanceStatus: string;
};

type DutySchedule = {
  id: string;
  userId: string;
  dutyDate: string;
  scheduleStatus: string;
  shift: { shiftName: string; startTime: string; endTime: string };
  labRoom: { labCode: string };
  attendanceLog?: { checkInTime: string | null; checkOutTime: string | null } | null;
};

type DashboardPayload = { allLogs: AttendanceLog[] };

type StaffActiveStudent = {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  labCode: string;
  checkInTime: string | null;
  attendanceStatus: string;
};

type StaffSchedule = {
  userId: string;
  dutyDate: string;
  scheduleStatus: string;
  shift: { startTime: string; endTime: string };
  labRoom: { labCode: string };
};

type StaffIncident = {
  incidentStatus: string;
};

function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white px-4 py-4 text-center text-xs leading-relaxed text-gray-600 sm:px-6">
      <p className="font-medium text-slate-800">Phòng Lab 5.18, Lầu 5, Tòa A, Cơ sở chính • Trường Đại học Văn Lang</p>
      <p className="mt-0.5">Hệ thống Quản lý &amp; Điểm danh Phòng Lab • Khoa Công nghệ Thông tin</p>
    </footer>
  );
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKey(value: string) {
  return value.slice(0, 10);
}

function formatDate(value: string) {
  return new Date(`${dateKey(value)}T00:00:00`).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(value: string | null) {
  return value
    ? new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : "—";
}

function attendanceLabel(status: string) {
  switch (status) {
    case "ON_TIME": return { label: "Đúng giờ", className: "border-emerald-300 bg-emerald-50 text-emerald-900" };
    case "LATE": return { label: "Đi trễ", className: "border-amber-300 bg-amber-50 text-amber-900" };
    case "EARLY_LEAVE": return { label: "Về sớm", className: "border-blue-300 bg-blue-50 text-blue-900" };
    case "MISSING_CHECKOUT": return { label: "Thiếu giờ ra", className: "border-rose-300 bg-rose-50 text-rose-900" };
    default: return { label: "Đã ghi nhận", className: "border-gray-300 bg-gray-100 text-gray-800" };
  }
}

function StudentOverview({ userName, userId, studentCode }: { userName: string; userId: string; studentCode: string }) {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [schedules, setSchedules] = useState<DutySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      setLoadError("");
      try {
        const [dashboardResponse, schedulesResponse] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/schedules"),
        ]);
        const [dashboardResult, schedulesResult] = await Promise.all([
          dashboardResponse.json(),
          schedulesResponse.json(),
        ]);

        if (!dashboardResult.success || !schedulesResult.success) {
          throw new Error("Không thể tải dữ liệu tổng quan.");
        }
        if (!cancelled) {
          setDashboard(dashboardResult);
          setSchedules(schedulesResult.schedules || []);
        }
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Không thể tải dữ liệu tổng quan.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOverview();
    return () => { cancelled = true; };
  }, [userId]);

  const today = localDateKey(new Date());
  const monthPrefix = today.slice(0, 7);

  const studentLogs = useMemo(() => {
    return (dashboard?.allLogs || [])
      .filter((log) => log.studentCode === studentCode)
      .sort((a, b) => new Date(b.checkInTime || b.dutyDate).getTime() - new Date(a.checkInTime || a.dutyDate).getTime());
  }, [dashboard, studentCode]);

  const monthlyHours = studentLogs
    .filter((log) => dateKey(log.dutyDate).startsWith(monthPrefix))
    .reduce((total, log) => total + (Number(log.totalHours) || 0), 0);

  const nextShift = useMemo(() => {
    const now = new Date();
    return schedules
      .filter((schedule) => schedule.userId === userId && dateKey(schedule.dutyDate) >= today)
      .filter((schedule) => !["REJECTED", "ABSENT", "COMPLETED"].includes(schedule.scheduleStatus))
      .filter((schedule) => {
        const start = new Date(`${dateKey(schedule.dutyDate)}T${schedule.shift.startTime}:00`);
        return start >= now && !schedule.attendanceLog?.checkInTime;
      })
      .sort((a, b) => {
        const aStart = `${dateKey(a.dutyDate)}T${a.shift.startTime}`;
        const bStart = `${dateKey(b.dutyDate)}T${b.shift.startTime}`;
        return aStart.localeCompare(bStart);
      })[0] || null;
  }, [schedules, userId, today]);

  const todaysSchedules = schedules.filter(
    (schedule) => schedule.userId === userId && dateKey(schedule.dutyDate) === today
  );
  const checkedInToday = todaysSchedules.find((schedule) => schedule.attendanceLog?.checkInTime);
  const hasCheckedOut = Boolean(checkedInToday?.attendanceLog?.checkOutTime);
  const statusLabel = checkedInToday ? (hasCheckedOut ? "Đã Check-out" : "Đang trong ca") : "Chưa Check-in";
  const statusClass = checkedInToday
    ? hasCheckedOut
      ? "border-blue-300 bg-blue-50 text-blue-900"
      : "border-emerald-300 bg-emerald-50 text-emerald-900"
    : "border-amber-300 bg-amber-50 text-amber-900";

  return (
    <div className="flex min-h-[calc(100dvh-53px)] flex-col bg-gray-50 text-slate-900">
      <section aria-labelledby="overview-title" className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <header>
            <h2 id="overview-title" className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
              Xin chào, {userName}
            </h2>
            <p className="mt-1 text-sm text-gray-600">Tổng quan ca trực và hoạt động của bạn.</p>
          </header>

          {loadError && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              <span>{loadError}</span>
              <button type="button" onClick={() => window.location.reload()} className="min-h-10 rounded-md border border-rose-300 bg-white px-3 font-semibold hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700">
                Tải lại trang
              </button>
            </div>
          )}

          <section aria-label="Tóm tắt ca trực" className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <CalendarDays aria-hidden="true" className="h-4 w-4 text-gray-500" />
                Ca trực tiếp theo
              </div>
              {loading ? (
                <p role="status" className="mt-3 text-sm text-gray-600">Đang tải…</p>
              ) : nextShift ? (
                <>
                  <p className="mt-3 text-lg font-bold tabular-nums text-gray-900">
                    {nextShift.shift.startTime} - {nextShift.shift.endTime}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">{nextShift.labRoom.labCode}</p>
                  <p className="mt-1 text-xs text-gray-600">{formatDate(nextShift.dutyDate)}</p>
                </>
              ) : (
                <p className="mt-3 text-sm text-gray-700">Chưa có ca trực sắp tới</p>
              )}
            </article>

            <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Clock3 aria-hidden="true" className="h-4 w-4 text-gray-500" />
                Tổng giờ trực tháng này
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-gray-900">
                {loading ? "—" : `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(monthlyHours)} Giờ`}
              </p>
              <p className="mt-1 text-xs text-gray-600">Tính từ các ca đã ghi nhận điểm danh.</p>
            </article>

            <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <UserRound aria-hidden="true" className="h-4 w-4 text-gray-500" />
                Trạng thái điểm danh
              </div>
              {loading ? (
                <p role="status" className="mt-3 text-sm text-gray-600">Đang tải…</p>
              ) : (
                <>
                  <span className={`mt-3 inline-flex min-h-7 items-center rounded-md border px-2.5 text-sm font-semibold ${statusClass}`}>
                    {statusLabel}
                  </span>
                  <p className="mt-2 text-xs text-gray-600">{todaysSchedules.length ? "Tình trạng ca trực hôm nay." : "Chưa ghi nhận ca trực hôm nay."}</p>
                </>
              )}
            </article>
          </section>

          <section aria-labelledby="quick-actions-title">
            <h3 id="quick-actions-title" className="mb-3 text-base font-bold text-slate-900">Thao tác nhanh</h3>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/scan-station"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
              >
                <Zap aria-hidden="true" className="h-4 w-4" />
                Quét Barcode Điểm Danh
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/incidents"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors duration-150 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
              >
                <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                Báo Cáo Sự Cố Máy
              </Link>
              <Link
                href="/mobile-checkin"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors duration-150 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
              >
                <QrCode aria-hidden="true" className="h-4 w-4" />
                Điểm danh bằng QR
              </Link>
            </div>
          </section>

          <section aria-labelledby="recent-activity-title" className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
              <div>
                <h3 id="recent-activity-title" className="text-base font-bold text-slate-900">Lịch sử hoạt động</h3>
                <p className="mt-0.5 text-xs text-gray-600">Ba lượt điểm danh gần nhất.</p>
              </div>
              <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-sm font-semibold text-red-800 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700">
                Xem tất cả
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>

            {loading ? (
              <div role="status" className="px-4 py-8 text-center text-sm text-gray-600">Đang tải lịch sử…</div>
            ) : studentLogs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-700">Chưa có lịch sử điểm danh.</div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-left text-sm">
                    <caption className="sr-only">Ba lượt điểm danh gần nhất của bạn</caption>
                    <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-700">
                      <tr>
                        <th scope="col" className="px-4 py-3">Ngày</th>
                        <th scope="col" className="px-4 py-3">Giờ vào</th>
                        <th scope="col" className="px-4 py-3">Giờ ra</th>
                        <th scope="col" className="px-4 py-3">Số giờ</th>
                        <th scope="col" className="px-4 py-3">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {studentLogs.slice(0, 3).map((log) => {
                        const badge = attendanceLabel(log.attendanceStatus);
                        return (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="whitespace-nowrap px-4 py-3 text-gray-800">{formatDate(log.dutyDate)}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums text-gray-900">{formatTime(log.checkInTime)}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums text-gray-900">{formatTime(log.checkOutTime)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-gray-800">{log.durationText || "—"}</td>
                            <td className="px-4 py-3"><span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${badge.className}`}>{badge.label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-gray-200 md:hidden">
                  {studentLogs.slice(0, 3).map((log) => {
                    const badge = attendanceLabel(log.attendanceStatus);
                    return (
                      <article key={log.id} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-gray-900">{formatDate(log.dutyDate)}</h4>
                          <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${badge.className}`}>{badge.label}</span>
                        </div>
                        <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                          <div><dt className="text-gray-600">Giờ vào</dt><dd className="mt-0.5 font-mono tabular-nums text-gray-900">{formatTime(log.checkInTime)}</dd></div>
                          <div><dt className="text-gray-600">Giờ ra</dt><dd className="mt-0.5 font-mono tabular-nums text-gray-900">{formatTime(log.checkOutTime)}</dd></div>
                          <div><dt className="text-gray-600">Số giờ</dt><dd className="mt-0.5 text-gray-900">{log.durationText || "—"}</dd></div>
                        </dl>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function StaffOverview({ userName, isLecturer }: { userName: string; isLecturer: boolean }) {
  const [activeStudents, setActiveStudents] = useState<StaffActiveStudent[]>([]);
  const [incidents, setIncidents] = useState<StaffIncident[]>([]);
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadManagementOverview = async () => {
      try {
        const [attendanceResponse, incidentsResponse, schedulesResponse] = await Promise.all([
          fetch("/api/attendance/scan"),
          fetch("/api/incidents"),
          fetch("/api/schedules"),
        ]);
        const [attendanceResult, incidentsResult, schedulesResult] = await Promise.all([
          attendanceResponse.json(),
          incidentsResponse.json(),
          schedulesResponse.json(),
        ]);

        if (!attendanceResult.success || !incidentsResult.success || !schedulesResult.success) {
          throw new Error("Không thể tải dữ liệu quản lý. Vui lòng thử lại.");
        }
        if (cancelled) return;

        setActiveStudents(attendanceResult.activeStudents || []);
        setIncidents(incidentsResult.incidents || []);
        setSchedules(schedulesResult.schedules || []);
        setLoadError("");
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Không thể tải dữ liệu quản lý.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadManagementOverview();
    const intervalId = window.setInterval(loadManagementOverview, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const today = localDateKey(new Date());
  const currentTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  const currentShift = schedules.find((schedule) =>
    dateKey(schedule.dutyDate) === today &&
    schedule.scheduleStatus === "APPROVED" &&
    schedule.shift.startTime <= currentTime &&
    schedule.shift.endTime > currentTime
  );
  const pendingIncidents = incidents.filter(
    (incident) => incident.incidentStatus === "OPEN" || incident.incidentStatus === "IN_PROGRESS"
  ).length;
  const overviewTitle = isLecturer ? "Tổng quan Giảng viên" : "Tổng quan Quản trị viên";

  return (
    <div className="flex min-h-[calc(100dvh-53px)] flex-col bg-gray-50 text-slate-900">
      <section aria-labelledby="staff-overview-title" className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <header>
            <h2 id="staff-overview-title" className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
              <span className="block text-sm font-semibold text-gray-600">{overviewTitle}</span>
              <span className="mt-1 block">Xin chào, {userName}</span>
            </h2>
            <p className="mt-2 text-sm text-gray-600">Tổng quan tình hình phòng Lab. Dữ liệu tự cập nhật mỗi 15 giây.</p>
          </header>

          {loadError && (
            <div role="alert" className="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {loadError}
            </div>
          )}

          <section aria-label="Chỉ số quản lý" className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <UserRound aria-hidden="true" className="h-4 w-4 text-gray-500" />
                Sinh viên đang trực
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-gray-900">
                {loading ? "—" : <>{activeStudents.length} <span className="text-base font-semibold">Sinh viên</span></>}
              </p>
              <p className="mt-1 text-xs text-gray-600">Đang check-in tại phòng Lab.</p>
            </article>

            <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <AlertTriangle aria-hidden="true" className={`h-4 w-4 ${pendingIncidents > 0 ? "text-amber-700" : "text-gray-500"}`} />
                Sự cố phần cứng
              </div>
              <p className={`mt-3 text-2xl font-bold tabular-nums ${pendingIncidents > 0 ? "text-amber-800" : "text-gray-900"}`}>
                {loading ? "—" : <>{pendingIncidents} <span className="text-base font-semibold">Máy hỏng</span></>}
              </p>
              <p className="mt-1 text-xs text-gray-600">Sự cố đang chờ xử lý hoặc đang xử lý.</p>
            </article>

            <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <CalendarDays aria-hidden="true" className="h-4 w-4 text-gray-500" />
                Ca trực hiện tại
              </div>
              {loading ? (
                <p className="mt-3 text-sm text-gray-600">Đang tải…</p>
              ) : currentShift ? (
                <>
                  <p className="mt-3 text-lg font-bold tabular-nums text-gray-900">{currentShift.shift.startTime} - {currentShift.shift.endTime}</p>
                  <p className="mt-1 text-sm text-gray-700">{currentShift.labRoom.labCode}</p>
                </>
              ) : (
                <p className="mt-3 text-sm font-medium text-gray-700">Không có ca trực hiện tại</p>
              )}
            </article>
          </section>

          <section aria-labelledby="management-actions-title">
            <h3 id="management-actions-title" className="mb-3 text-base font-bold text-slate-900">Thao tác nhanh</h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/schedules" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2">
                <CalendarDays aria-hidden="true" className="h-4 w-4" />
                Quản lý lịch trực
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link href="/incidents" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2">
                <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                Duyệt báo cáo sự cố
              </Link>
            </div>
          </section>

          <section aria-labelledby="active-students-title" className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 sm:px-5">
              <div>
                <h3 id="active-students-title" className="text-base font-bold text-slate-900">Sinh viên đang có mặt</h3>
                <p className="mt-0.5 text-xs text-gray-600">Danh sách cập nhật tự động mỗi 15 giây.</p>
              </div>
              <span aria-live="polite" className="rounded-md border border-gray-300 bg-gray-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-gray-800">
                {loading ? "Đang tải" : `${activeStudents.length} sinh viên`}
              </span>
            </div>

            {loading ? (
              <div role="status" className="px-4 py-8 text-center text-sm text-gray-600">Đang tải dữ liệu điểm danh…</div>
            ) : activeStudents.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-700">Hiện không có sinh viên nào đang check-in.</div>
            ) : (
              <>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full border-collapse text-left text-sm">
                    <caption className="sr-only">Sinh viên hiện đang check-in tại phòng Lab</caption>
                    <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-700">
                      <tr>
                        <th scope="col" className="px-4 py-3">MSSV</th>
                        <th scope="col" className="px-4 py-3">Họ và Tên</th>
                        <th scope="col" className="px-4 py-3">Giờ Check-in</th>
                        <th scope="col" className="px-4 py-3">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {activeStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums text-gray-800">{student.studentCode}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{student.studentName}</td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums text-gray-800">{formatTime(student.checkInTime)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${student.attendanceStatus === "LATE" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
                              {student.attendanceStatus === "LATE" ? "Đang trực · Đi trễ" : "Đang trực"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-gray-200 sm:hidden">
                  {activeStudents.map((student) => (
                    <article key={student.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-xs tabular-nums text-gray-700">{student.studentCode}</p>
                          <h4 className="mt-0.5 text-sm font-semibold text-gray-900">{student.studentName}</h4>
                        </div>
                        <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${student.attendanceStatus === "LATE" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
                          {student.attendanceStatus === "LATE" ? "Đang trực · Đi trễ" : "Đang trực"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-700">Check-in: <span className="font-mono tabular-nums">{formatTime(student.checkInTime)}</span></p>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function GuestOverview({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="flex min-h-[calc(100dvh-53px)] flex-col bg-white text-slate-900">
      <section aria-labelledby="guest-home-title" className="flex flex-1 items-center justify-center border-b border-gray-200 px-4 py-10 text-center sm:px-6 sm:py-12">
        <div className="w-full max-w-3xl space-y-4">
          <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold tracking-wide text-red-800">
            <Building2 aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>KHOA CÔNG NGHỆ THÔNG TIN • TRƯỜNG ĐẠI HỌC VĂN LANG</span>
          </div>
          <h1 id="guest-home-title" className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem]">
            Hệ thống Quản lý &amp; Điểm danh phòng LAB bằng <span className="text-red-700">Barcode &amp; Mã QR</span>
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-gray-700 sm:text-base">Quản lý thiết bị và điểm danh ca trực phòng máy cho sinh viên Khoa Công nghệ Thông tin, Trường Đại học Văn Lang.</p>
          {isLoading ? (
            <p role="status" className="min-h-11 content-center text-sm text-gray-600">Đang kiểm tra trạng thái đăng nhập…</p>
          ) : (
            <Link href="/login" className="mx-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2">
              <LogIn aria-hidden="true" className="h-4 w-4" />
              Đăng nhập để sử dụng hệ thống
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

export default function HomePageView() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <GuestOverview isLoading />;
  if (!user) return <GuestOverview isLoading={false} />;
  if (user.role === "STUDENT") {
    return <StudentOverview userName={user.fullName} userId={user.id} studentCode={user.studentCode} />;
  }
  return <StaffOverview userName={user.fullName} isLecturer={user.role === "LECTURER"} />;
}
