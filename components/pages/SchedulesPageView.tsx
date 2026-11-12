"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ArrowLeft,
  Plus,
  X,
  Trash2,
  Search,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";

function getLocalDateValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function getPcStatus(schedule: any): "GOOD" | "ISSUE" | "UNKNOWN" {
  if (schedule.labRoom?.status === "MAINTENANCE") return "ISSUE";
  const computers = schedule.labRoom?.equipments || [];
  if (computers.length === 0) return "UNKNOWN";
  return computers.some((computer: any) => computer.status !== "GOOD") ? "ISSUE" : "GOOD";
}

function getPcStatusLabel(schedule: any) {
  const status = getPcStatus(schedule);
  const computers = schedule.labRoom?.equipments || [];
  if (status === "UNKNOWN") return "Chưa có dữ liệu PC";
  if (schedule.labRoom?.status === "MAINTENANCE") return "Phòng đang bảo trì";
  if (status === "GOOD") return `${computers.length} máy hoạt động`;
  const issueCount = computers.filter((computer: any) => computer.status !== "GOOD").length;
  return `${issueCount} máy cần kiểm tra`;
}

function getAttendanceLabel(schedule: any) {
  const attendance = schedule.attendanceLog;
  if (schedule.scheduleStatus === "ABSENT") return { label: "Vắng", className: "border-rose-300 bg-rose-50 text-rose-900" };
  if (attendance?.checkInTime) {
    if (attendance.attendanceStatus === "LATE") return { label: "Đã check-in · Trễ", className: "border-amber-300 bg-amber-50 text-amber-900" };
    if (attendance.checkOutTime) return { label: "Đã hoàn tất", className: "border-emerald-300 bg-emerald-50 text-emerald-900" };
    return { label: "Đã check-in", className: "border-emerald-300 bg-emerald-50 text-emerald-900" };
  }
  if (schedule.scheduleStatus === "REJECTED") return { label: "Từ chối", className: "border-gray-300 bg-gray-100 text-gray-800" };
  return { label: "Chưa check-in", className: "border-blue-300 bg-blue-50 text-blue-900" };
}

function formatCheckTime(value?: string | Date | null) {
  return value ? new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";
}

function PcStatusBadge({ schedule }: { schedule: any }) {
  const status = getPcStatus(schedule);
  const className = status === "GOOD"
    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
    : status === "ISSUE"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "border-gray-300 bg-gray-100 text-gray-800";
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${className}`}>{getPcStatusLabel(schedule)}</span>;
}

function AttendanceBadge({ schedule }: { schedule: any }) {
  const { label, className } = getAttendanceLabel(schedule);
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${className}`}>{label}</span>;
}

function ScheduleTableRow({ schedule, role, onDelete }: { schedule: any; role: string | null; onDelete: (id: string) => void }) {
  return (
    <tr className="align-top hover:bg-gray-50">
      <td className="whitespace-nowrap px-4 py-3">
        <div className="font-semibold text-gray-900">{schedule.shift.shiftName}</div>
        <div className="mt-1 text-xs tabular-nums text-gray-600">{schedule.shift.startTime}–{schedule.shift.endTime}</div>
      </td>
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-900">{schedule.user.fullName || "Sinh viên VLU"}</div>
        <div className="mt-1 font-mono text-xs tabular-nums text-gray-700">{schedule.user.studentCode}</div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-800">{schedule.labRoom.labCode}</td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-sm tabular-nums text-gray-900">{formatCheckTime(schedule.attendanceLog?.checkInTime)}</td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-sm tabular-nums text-gray-900">{formatCheckTime(schedule.attendanceLog?.checkOutTime)}</td>
      <td className="px-4 py-3"><AttendanceBadge schedule={schedule} /></td>
      <td className="px-4 py-3"><PcStatusBadge schedule={schedule} /></td>
      {role === "ADMIN" && (
        <td className="px-2 py-2">
          <button
            type="button"
            onClick={() => onDelete(schedule.id)}
            aria-label={`Xóa lịch trực của ${schedule.user.fullName || schedule.user.studentCode}`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-gray-600 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        </td>
      )}
    </tr>
  );
}

function ScheduleMobileCard({ schedule, role, onDelete }: { schedule: any; role: string | null; onDelete: (id: string) => void }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">{schedule.shift.shiftName}</h3>
          <p className="mt-1 text-sm tabular-nums text-gray-600">{schedule.shift.startTime}–{schedule.shift.endTime} <span aria-hidden="true">·</span> {schedule.labRoom.labCode}</p>
        </div>
        {role === "ADMIN" && (
          <button
            type="button"
            onClick={() => onDelete(schedule.id)}
            aria-label={`Xóa lịch trực của ${schedule.user.fullName || schedule.user.studentCode}`}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="space-y-3 pt-3 text-sm">
        <div>
          <p className="font-semibold text-gray-900">{schedule.user.fullName || "Sinh viên VLU"}</p>
          <p className="mt-0.5 font-mono text-xs tabular-nums text-gray-700">MSSV: {schedule.user.studentCode}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div><dt className="text-xs text-gray-600">Check-in</dt><dd className="mt-0.5 font-mono tabular-nums text-gray-900">{formatCheckTime(schedule.attendanceLog?.checkInTime)}</dd></div>
          <div><dt className="text-xs text-gray-600">Check-out</dt><dd className="mt-0.5 font-mono tabular-nums text-gray-900">{formatCheckTime(schedule.attendanceLog?.checkOutTime)}</dd></div>
          <div><dt className="mb-1 text-xs text-gray-600">Điểm danh</dt><dd><AttendanceBadge schedule={schedule} /></dd></div>
          <div><dt className="mb-1 text-xs text-gray-600">Tình trạng PC</dt><dd><PcStatusBadge schedule={schedule} /></dd></div>
        </dl>
      </div>
    </article>
  );
}

function SchedulesContent() {
  const { user, role } = useAuth();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pcFilter, setPcFilter] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState(getLocalDateValue());

  // Form states
  const [newUserId, setNewUserId] = useState("");
  const [newLabId, setNewLabId] = useState("");
  const [newShiftId, setNewShiftId] = useState("");
  const [newDutyDate, setNewDutyDate] = useState(new Date().toISOString().slice(0, 10));
  const [newNote, setNewNote] = useState("");

  const loadSchedules = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/schedules");
      const json = await res.json();
      if (json.success) {
        setSchedules(json.schedules || []);
        setLabs(json.labs || []);
        setShifts(json.shifts || []);
        setStudents(json.students || []);

        if (json.students?.length > 0 && !newUserId) setNewUserId(json.students[0].id);
        if (json.labs?.length > 0 && !newLabId) setNewLabId(json.labs[0].id);
        if (json.shifts?.length > 0 && !newShiftId) setNewShiftId(json.shifts[0].id);
      } else {
        setLoadError(json.message || "Không thể tải lịch trực.");
      }
    } catch {
      setLoadError("Không thể kết nối để tải lịch trực. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: newUserId,
          labId: newLabId,
          shiftId: newShiftId,
          dutyDate: newDutyDate,
          note: newNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewNote("");
        loadSchedules();
      } else {
        alert("Lỗi: " + data.message);
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa lịch phân công này?")) return;
    try {
      const res = await fetch(`/api/schedules?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        loadSchedules();
      } else {
        alert("Lỗi: " + data.message);
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    }
  };

  const filteredSchedules = schedules.filter((schedule) => {
    const scheduleDate = new Date(schedule.dutyDate).toISOString().slice(0, 10);
    const query = searchTerm.trim().toLocaleLowerCase("vi-VN");
    const matchesDate = scheduleDate === selectedDate;
    const matchesStudent =
      !query ||
      (schedule.user.fullName || "Sinh viên VLU").toLocaleLowerCase("vi-VN").includes(query) ||
      schedule.user.studentCode.toLocaleLowerCase("vi-VN").includes(query);
    const pcStatus = getPcStatus(schedule);
    const matchesPc = pcFilter === "ALL" || pcStatus === pcFilter;
    return matchesDate && matchesStudent && matchesPc;
  });

  const checkedInCount = filteredSchedules.filter((schedule) => schedule.attendanceLog?.checkInTime).length;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 shadow-sm transition"
              title="Về Trang Chủ"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
                THỜI KHÓA BIỂU & PHÂN CÔNG TRỰC PHÒNG LAB
              </h1>
              <p className="text-xs text-gray-500">
                Khoa Công nghệ Thông tin • Lịch phân công trực phòng máy theo Tuần (Ca 1, Ca 2, Ca 3)
              </p>
            </div>
          </div>

            <button
              onClick={() => {
                setShowAddModal(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              Đăng ký / Phân công Ca trực
            </button>
        </header>

        <section aria-labelledby="schedule-list-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="schedule-list-heading" className="text-base font-bold text-gray-900">Lịch trực trong ngày</h2>
              <p className="mt-1 text-sm text-gray-600">Theo dõi sinh viên, giờ điểm danh và tình trạng máy tính tại phòng.</p>
            </div>
            <div className="text-sm text-gray-700" aria-live="polite">
              <span className="font-semibold tabular-nums">{filteredSchedules.length}</span> ca trực
              <span className="px-2 text-gray-400" aria-hidden="true">·</span>
              <span className="font-semibold tabular-nums">{checkedInCount}</span> đã check-in
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1fr)_12rem_12rem_auto] lg:items-end">
            <div>
              <label htmlFor="schedule-date" className="mb-1.5 block text-sm font-medium text-gray-800">Ngày trực</label>
              <input
                id="schedule-date"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-1"
              />
            </div>
            <div>
              <label htmlFor="schedule-search" className="mb-1.5 block text-sm font-medium text-gray-800">Tìm sinh viên</label>
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  id="schedule-search"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Nhập MSSV hoặc họ tên"
                  className="min-h-11 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-1"
                />
              </div>
            </div>
            <div>
              <label htmlFor="pc-status-filter" className="mb-1.5 block text-sm font-medium text-gray-800">Tình trạng PC</label>
              <select
                id="pc-status-filter"
                value={pcFilter}
                onChange={(event) => setPcFilter(event.target.value)}
                className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-1"
              >
                <option value="ALL">Tất cả tình trạng</option>
                <option value="GOOD">Đang hoạt động</option>
                <option value="ISSUE">Có máy cần sửa</option>
                <option value="UNKNOWN">Chưa có dữ liệu PC</option>
              </select>
            </div>
            <button
              type="button"
              onClick={loadSchedules}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-1"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Làm mới
            </button>
          </div>

          {loadError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
              <span>{loadError}</span>
              <button onClick={loadSchedules} className="min-h-10 rounded-md border border-rose-300 bg-white px-3 font-semibold hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-1">Thử lại</button>
            </div>
          ) : loading ? (
            <div className="rounded-md border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-600" role="status">Đang tải lịch trực…</div>
          ) : filteredSchedules.length === 0 ? (
            <div className="rounded-md border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-700">
              Không có ca trực phù hợp trong ngày đã chọn. Thử đổi ngày hoặc xóa bộ lọc sinh viên / tình trạng PC.
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white lg:block">
                <table className="w-full border-collapse text-left text-sm">
                  <caption className="sr-only">Lịch trực, thời gian điểm danh và tình trạng máy tính trong ngày đã chọn</caption>
                  <thead className="bg-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-700">
                    <tr>
                      <th scope="col" className="px-4 py-3">Ca trực</th>
                      <th scope="col" className="px-4 py-3">Sinh viên</th>
                      <th scope="col" className="px-4 py-3">Phòng Lab</th>
                      <th scope="col" className="px-4 py-3">Check-in</th>
                      <th scope="col" className="px-4 py-3">Check-out</th>
                      <th scope="col" className="px-4 py-3">Điểm danh</th>
                      <th scope="col" className="px-4 py-3">Tình trạng PC</th>
                      {role === "ADMIN" && <th scope="col" className="px-4 py-3"><span className="sr-only">Thao tác</span></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredSchedules.map((schedule) => <ScheduleTableRow key={schedule.id} schedule={schedule} role={role} onDelete={handleDeleteSchedule} />)}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 lg:hidden">
                {filteredSchedules.map((schedule) => <ScheduleMobileCard key={schedule.id} schedule={schedule} role={role} onDelete={handleDeleteSchedule} />)}
              </div>
            </>
          )}
        </section>
      </div>

      {/* MODAL PHÂN CÔNG CA TRỰC MỚI */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">ĐĂNG KÝ / PHÂN CÔNG CA TRỰC MỚI</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-3.5 text-xs">
              <div>
                <label className="text-gray-700 font-medium block mb-1">Sinh viên trực:</label>
                <select
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  {students.map((sv) => (
                    <option key={sv.id} value={sv.id}>
                      {sv.fullName || "Sinh viên VLU"} ({sv.studentCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-700 font-medium block mb-1">Phòng Lab phân công:</label>
                <select
                  value={newLabId}
                  onChange={(e) => setNewLabId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  {labs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.labCode} - {l.labName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-700 font-medium block mb-1">Khung ca trực:</label>
                  <select
                    value={newShiftId}
                    onChange={(e) => setNewShiftId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shiftName} ({s.startTime} - {s.endTime})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-700 font-medium block mb-1">Ngày trực:</label>
                  <input
                    type="date"
                    value={newDutyDate}
                    onChange={(e) => setNewDutyDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-700 font-medium block mb-1">Ghi chú phân công:</label>
                <input
                  type="text"
                  placeholder="VD: Kiểm tra mạng đầu giờ..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-sm"
                >
                  Lưu phân công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SchedulesPageView() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "LECTURER"]}>
      <SchedulesContent />
    </ProtectedRoute>
  );
}
