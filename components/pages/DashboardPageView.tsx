"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  ArrowLeft,
  Clock,
  UserCheck,
  Download,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Printer,
  PlusCircle,
  X,
  Camera,
  AlertTriangle,
  Award,
  Eye,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAssetPath } from "@/lib/asset-path";

function isCrossDayLog(log: any): boolean {
  if (!log?.checkInTime || !log?.checkOutTime) return false;
  return new Date(log.checkInTime).toDateString() !== new Date(log.checkOutTime).toDateString();
}

function getLocalDateKey(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAttendanceDateKey(log: any): string {
  // Nhật ký cần lọc theo ngày quét thực tế; dutyDate có thể bị lệch ngày do UTC.
  return getLocalDateKey(log?.checkInTime || log?.dutyDate);
}

function LogStatusBadge({ log }: { log: any }) {
  if (!log?.checkOutTime) {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        Đang trực
      </span>
    );
  }
  if (isCrossDayLog(log)) {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        Qua ngày
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
      Hoàn thành
    </span>
  );
}

function DashboardContent() {
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [datePreset, setDatePreset] = useState<"ALL" | "TODAY" | "7DAYS" | "MONTH">("TODAY");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modal điểm danh thủ công
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualStudentCode, setManualStudentCode] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualInTime, setManualInTime] = useState("08:00");
  const [manualOutTime, setManualOutTime] = useState("12:00");
  const [manualNote, setManualNote] = useState("Quên thẻ sinh viên");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Modal phóng to ảnh Snapshot
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Modal xem toàn bộ lịch sử quẹt thẻ của 1 sinh viên
  const [historyStudent, setHistoryStudent] = useState<any | null>(null);

  const loadDashboard = async () => {
    try {
      const res = await fetch(getAssetPath("/api/dashboard"));
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error("Dashboard refresh failed");
      setData(json);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // Tự động làm mới dữ liệu mỗi 10 giây
    const interval = setInterval(loadDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleForceCheckout = async (logId: string, studentName: string) => {
    if (!confirm(`Xác nhận Check-out kết thúc lượt trực cho sinh viên ${studentName}?`)) return;
    try {
      const res = await fetch(getAssetPath("/api/attendance/scan"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId }),
      });
      const resData = await res.json();
      if (resData.success) {
        setActionMessage(resData.message);
        setTimeout(() => setActionMessage(null), 4000);
        loadDashboard();
      } else {
        alert("Lỗi: " + resData.message);
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    }
  };

  const handleManualAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentCode.trim() || !manualDate || !manualInTime) {
      alert("Vui lòng nhập đầy đủ MSSV, ngày và giờ vào!");
      return;
    }

    setManualSubmitting(true);
    try {
      const res = await fetch(getAssetPath("/api/dashboard"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentCode: manualStudentCode.trim(),
          dutyDate: manualDate,
          checkInTimeStr: manualInTime,
          checkOutTimeStr: manualOutTime || null,
          note: manualNote,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        setActionMessage(resData.message);
        setTimeout(() => setActionMessage(null), 4000);
        setShowManualModal(false);
        setManualStudentCode("");
        loadDashboard();
      } else {
        alert("Lỗi: " + resData.message);
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setManualSubmitting(false);
    }
  };

  // XUẤT FILE EXCEL (.xlsx) 2 SHEET: THỐNG KÊ CA TRỰC & NHẬT KÝ RA VÀO
  const handleExportExcel = () => {
    if (!data || !data.allLogs) return;

    const studentSummaryData = (data.studentStats || []).map((sv: any, idx: number) => ({
      STT: idx + 1,
      "Họ và tên": sv.fullName || "Chưa có tên",
      MSSV: sv.studentCode,
      "Lớp": sv.className || "DTH-CNTT",
      "Tổng lượt vào/ra": sv.totalShifts || 0,
    }));

    studentSummaryData.push({
      STT: "" as any,
      "Họ và tên": "TỔNG CỘNG TOÀN BỘ SINH VIÊN",
      MSSV: "",
      "Lớp": "",
      "Tổng lượt vào/ra": (data.studentStats || []).reduce((acc: number, s: any) => acc + (s.totalShifts || 0), 0),
    });

    const detailedLogsData = data.allLogs.map((log: any, idx: number) => ({
      STT: idx + 1,
      "Họ và tên": log.studentName,
      MSSV: log.studentCode,
      "Ngày trực": new Date(log.dutyDate).toLocaleDateString("vi-VN"),
      "Giờ vào": log.checkInTime
        ? new Date(log.checkInTime).toLocaleTimeString("vi-VN")
        : "--:--",
      "Giờ ra": log.checkOutTime
        ? new Date(log.checkOutTime).toLocaleTimeString("vi-VN")
        : "--:--",
      "Thời lượng": log.durationText && log.durationText !== "--" ? log.durationText : (log.checkOutTime ? "--" : "Đang trực"),
      "Trạng thái": !log.checkOutTime ? "Đang trực" : isCrossDayLog(log) ? "Qua ngày" : "Hoàn thành",
    }));

    const workbook = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.json_to_sheet(studentSummaryData);
    wsSummary["!cols"] = [
      { wch: 6 },
      { wch: 26 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(workbook, wsSummary, "DanhSachSinhVien");

    const wsDetails = XLSX.utils.json_to_sheet(detailedLogsData);
    wsDetails["!cols"] = [
      { wch: 6 },
      { wch: 26 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(workbook, wsDetails, "NhatKy_RaVao");

    XLSX.writeFile(
      workbook,
      `VLU_PhongLab_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // IN BÁO CÁO A4
  const handlePrintReport = () => {
    window.print();
  };

  // Lọc nhật ký theo Preset thời gian
  const filteredLogs = useMemo(() => {
    if (!data?.allLogs) return [];
    const now = new Date();
    const todayStr = getLocalDateKey(now);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const currentMonth = todayStr.slice(0, 7);

    return data.allLogs.filter((log: any) => {
      // 2. Preset thời gian
      const attendanceDate = log.checkInTime || log.dutyDate;
      const logDate = attendanceDate ? new Date(attendanceDate) : null;
      const logDateStr = getAttendanceDateKey(log);

      if (datePreset === "TODAY" && logDateStr !== todayStr) return false;
      if (datePreset === "7DAYS" && (!logDate || logDate < sevenDaysAgo)) return false;
      if (datePreset === "MONTH" && !logDateStr.startsWith(currentMonth)) return false;

      // 3. Trạng thái
      if (statusFilter === "IN_LAB" && log.checkOutTime) return false;
      if (statusFilter === "CHECKED_OUT" && !log.checkOutTime) return false;

      // 4. Tìm kiếm từ khóa
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches =
          (log.studentName || "").toLowerCase().includes(term) ||
          log.studentCode.includes(term) ||
          log.labName.toLowerCase().includes(term);
        if (!matches) return false;
      }

      return true;
    });
  }, [data, datePreset, statusFilter, searchTerm]);

  // Lượt quét thẻ mới nhất
  const latestLog = useMemo(() => {
    if (!data?.allLogs || data.allLogs.length === 0) return null;
    return data.allLogs[0];
  }, [data]);

  // Danh sách các lượt quét trong ngày hôm nay
  const todayLogs = useMemo(() => {
    if (!data?.allLogs) return [];
    const todayStr = getLocalDateKey(new Date());
    return data.allLogs.filter((log: any) => {
      return getAttendanceDateKey(log) === todayStr;
    });
  }, [data]);

  const todayStudentCount = useMemo(
    () => new Set(todayLogs.map((log: any) => log.studentCode).filter(Boolean)).size,
    [todayLogs]
  );

  const needsAttentionCount = useMemo(() => {
    const todayStr = getLocalDateKey(new Date());
    return (data?.activeInLab || []).filter((student: any) =>
      student.isStale || getLocalDateKey(student.checkInTime) !== todayStr
    ).length;
  }, [data]);

  const isLabOpen = (() => {
    const now = new Date();
    const day = now.getDay();
    const time = now.getHours() * 60 + now.getMinutes();
    return day >= 1 && day <= 6 && ((time >= 8 * 60 && time < 12 * 60) || (time >= 13 * 60 && time < 17 * 60));
  })();

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER BẢNG QUẢN LÝ (Ẩn khi in ấn) */}
        <header className="print:hidden flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 shadow-xs transition"
              title="Về Trạm Quét Laptop"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-rose-500" />
                {t.dashboard.title}
              </h1>
              <p className="text-xs text-gray-500">
                {t.dashboard.subtitle}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-gray-700">
                  <Clock className="h-3.5 w-3.5 text-gray-500" />
                  <span>{t.dashboard.openHoursLabel} {t.dashboard.openDays} · {t.dashboard.morningEvening}</span>
                </span>
                <span className={"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold " + (isLabOpen ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700")}>
                  <span className={"h-2 w-2 rounded-full " + (isLabOpen ? "bg-emerald-500" : "bg-gray-500")} />
                  {isLabOpen ? t.dashboard.openNow : t.dashboard.closedNow}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowManualModal(true)}
              className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{t.dashboard.manualBtn}</span>
            </button>

            <button
              onClick={handlePrintReport}
              className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
              title="In Báo Cáo A4 Chuẩn Khoa"
            >
              <Printer className="h-4 w-4 text-gray-500" />
              <span>{t.dashboard.printBtn}</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              <span>{t.dashboard.exportBtn}</span>
            </button>

            <button
              onClick={() => loadDashboard()}
              className="p-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-xl text-xs transition"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-rose-500" : ""}`} />
            </button>
          </div>
        </header>

        {/* TIÊU ĐỀ KHI IN ẤN CHUẨN VLU (Chỉ hiện khi in) */}
        <div className="hidden print:block text-center border-b pb-4 mb-4">
          <div className="text-sm font-bold uppercase">Trường Đại Học Văn Lang • Khoa Công Nghệ Thông Tin</div>
          <h2 className="text-xl font-bold uppercase mt-1">BẢNG THỐNG KÊ RA VÀO PHÒNG LAB</h2>
          <div className="text-xs text-gray-500 mt-1">Ngày lập báo cáo: {new Date().toLocaleDateString("vi-VN")}</div>
        </div>

        {/* THÔNG BÁO HÀNH ĐỘNG */}
        {actionMessage && (
          <div className="print:hidden rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-900 flex items-center gap-2 shadow-xs animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* KPI SUMMARY */}
        <section aria-label="Attendance summary" className="print:hidden grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: t.dashboard.presentCount, value: data?.activeInLab?.length || 0, tone: "text-emerald-700", live: true },
            { label: t.dashboard.todayLogsCount, value: todayLogs.length, tone: "text-gray-900" },
            { label: t.dashboard.todayStudentsCount, value: todayStudentCount, tone: "text-gray-900" },
            { label: t.dashboard.needsAttention, value: needsAttentionCount, tone: needsAttentionCount > 0 ? "text-amber-700" : "text-gray-700" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                {kpi.live && <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />}
                <span>{kpi.label}</span>
                {!kpi.live && <span className="text-gray-500">· {t.dashboard.todayLabel}</span>}
              </div>
              {loading && !data ? (
                <div className="mt-2 h-7 w-16 animate-pulse rounded bg-gray-100" />
              ) : (
                <div className={"mt-1 font-mono text-2xl font-bold " + kpi.tone}>{kpi.value}</div>
              )}
            </div>
          ))}
        </section>

        {loadError && (
          <div role="status" className="print:hidden rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {t.dashboard.loadError}
          </div>
        )}

        {/* LIVE ATTENDANCE AND LATEST SCAN */}
        <section className="print:hidden grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs sm:p-5">
            {!data && loading ? (
              <div className="space-y-3">
                <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
                <div className="h-20 animate-pulse rounded-xl bg-gray-50" />
              </div>
            ) : (data?.activeInLab?.length || 0) === 0 ? (
              <div className="flex min-h-8 items-center gap-2 text-sm text-gray-600">
                <UserCheck className="h-4 w-4 shrink-0 text-gray-500" />
                <span>{t.dashboard.liveEmpty}</span>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-3">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <h2 className="text-sm font-bold text-gray-900">{t.dashboard.liveTitle}</h2>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {data.activeInLab.map((sv: any) => (
                    <div
                      key={sv.id}
                      className={"flex items-center gap-3 rounded-xl border p-3.5 transition " + (sv.isStale ? "border-amber-300 bg-amber-50/50" : "border-emerald-200 bg-emerald-50/30")}
                    >
                      {sv.snapshot ? (
                        <button onClick={() => setPreviewImage(sv.snapshot)} className="relative shrink-0 group" title={t.dashboard.previewPhoto}>
                          <img src={sv.snapshot} alt={t.dashboard.checkInPhoto} className="h-11 w-11 rounded-lg border border-emerald-300 object-cover transition group-hover:opacity-80" />
                          <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 text-xs text-white opacity-0 group-hover:opacity-100">{t.dashboard.viewPhoto}</span>
                        </button>
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-100 text-xs font-bold text-emerald-700">
                          {(sv.studentName || "?").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-gray-900">{sv.studentName || t.dashboard.unnamedStudent}</div>
                        <div className="font-mono text-xs text-gray-600">{sv.studentCode}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-800">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{t.dashboard.checkInTime}: {new Date(sv.checkInTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · {sv.duration}</span>
                        </div>
                        {sv.isStale && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                              {t.dashboard.liveStale}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleForceCheckout(sv.id, sv.studentName || sv.studentCode)}
                              className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                            >
                              {t.dashboard.forceCheckout}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <UserCheck className="h-4 w-4 text-rose-500" />
                {t.dashboard.latestTitle}
              </h2>
              {latestLog && (
                <span className={"inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold " + (latestLog.checkOutTime ? "border-gray-200 bg-gray-100 text-gray-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
                  {latestLog.checkOutTime ? t.dashboard.latestCheckedOut : t.dashboard.latestCheckedIn}
                </span>
              )}
            </div>

            {!data && loading ? (
              <div className="flex gap-4">
                <div className="h-24 w-24 animate-pulse rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-3 py-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ) : latestLog ? (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  {latestLog.snapshot ? (
                    <button type="button" onClick={() => setPreviewImage(latestLog.snapshot)} className="h-full w-full" title={t.dashboard.viewPhoto}>
                      <img src={latestLog.snapshot} alt={t.dashboard.scanPhoto} className="h-full w-full object-cover" />
                    </button>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-gray-500">
                      <Camera className="mb-1 h-6 w-6" />
                      <span className="text-xs">{t.dashboard.noPhoto}</span>
                    </div>
                  )}
                </div>
                <div className="w-full min-w-0 flex-1 space-y-2 text-xs">
                  <div>
                    <h3 className="truncate text-sm font-bold text-gray-900">{latestLog.studentName || t.dashboard.unnamedStudent}</h3>
                    <div className="mt-0.5 font-mono text-gray-600">MSSV: <span className="font-bold text-gray-800">{latestLog.studentCode}</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                      <span className="block text-xs text-gray-600">{t.dashboard.checkInTime}</span>
                      <span className="font-mono text-sm font-bold text-emerald-700">
                        {latestLog.checkInTime ? new Date(latestLog.checkInTime).toLocaleTimeString("vi-VN") : "--:--"}
                      </span>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                      <span className="block text-xs text-gray-600">{t.dashboard.checkOutTime}</span>
                      <span className="font-mono text-sm font-bold text-gray-700">
                        {latestLog.checkOutTime ? new Date(latestLog.checkOutTime).toLocaleTimeString("vi-VN") : "--:--"}
                      </span>
                    </div>
                  </div>
                  {latestLog.durationText && latestLog.durationText !== "--" && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2 text-xs text-gray-700">
                      <span>{t.dashboard.duration}:</span>
                      <span className="font-mono font-bold">{latestLog.durationText}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-24 items-center justify-center text-sm text-gray-600">{t.dashboard.latestEmpty}</div>
            )}
          </div>
        </section>
        {/* KHỐI 3: DANH SÁCH SINH VIÊN PHÒNG LAB */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Award className="h-4 w-4 text-rose-500" />
                {t.dashboard.studentsTableTitle}
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {t.dashboard.studentsTableSubtitle}
              </p>
            </div>
            <span className="text-[11px] text-gray-500 font-medium">
              Tổng cộng: <strong className="text-rose-600">{data?.studentStats?.length || 0}</strong> sinh viên
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-semibold tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">STT</th>
                  <th className="py-3 px-4">Họ và Tên</th>
                  <th className="py-3 px-4">Lớp</th>
                  <th className="py-3 px-4 text-center">Tổng lượt</th>
                  <th className="py-3 px-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {data?.studentStats?.map((sv: any, idx: number) => (
                  <tr key={sv.id} className="hover:bg-gray-50/80 transition">
                    <td className="py-3.5 px-4 text-gray-400">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-bold text-gray-900">{sv.fullName || "Chưa có tên"}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{sv.studentCode}</div>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium text-[11px]">
                        {sv.className || "DTH-CNTT"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-900 text-sm">
                      {sv.totalShifts || 0} <span className="text-gray-400 font-normal text-xs">lượt</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      <button
                        onClick={() => setHistoryStudent(sv)}
                        className="px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-rose-50 text-gray-700 hover:text-rose-600 border border-gray-200 hover:border-rose-200 text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-2xs"
                        title="Xem toàn bộ lịch sử quét thẻ check-in / check-out"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Xem nhật ký</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* KHỐI 4: BẢNG NHẬT KÝ RA / VÀO PHÒNG LAB */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-rose-500" />
                {t.dashboard.logsTableTitle}
              </h3>
            </div>

            {/* BỘ LỌC THỜI GIAN PRESET & TÌM KIẾM */}
            <div className="print:hidden flex flex-wrap items-center gap-2.5">
              {/* Presets */}
              <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-[11px]">
                <button
                  onClick={() => setDatePreset("ALL")}
                  className={`px-2.5 py-1 rounded-md transition ${datePreset === "ALL" ? "bg-white font-bold text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-800"}`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setDatePreset("TODAY")}
                  className={`px-2.5 py-1 rounded-md transition ${datePreset === "TODAY" ? "bg-white font-bold text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-800"}`}
                >
                  Hôm nay
                </button>
                <button
                  onClick={() => setDatePreset("7DAYS")}
                  className={`px-2.5 py-1 rounded-md transition ${datePreset === "7DAYS" ? "bg-white font-bold text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-800"}`}
                >
                  7 ngày qua
                </button>
                <button
                  onClick={() => setDatePreset("MONTH")}
                  className={`px-2.5 py-1 rounded-md transition ${datePreset === "MONTH" ? "bg-white font-bold text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-800"}`}
                >
                  Tháng này
                </button>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200 text-xs">
                <Filter className="h-3 w-3 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-gray-700 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Mọi trạng thái</option>
                  <option value="IN_LAB">Đang trực</option>
                  <option value="CHECKED_OUT">Hoàn thành</option>
                </select>
              </div>

              {/* Ô tìm kiếm */}
              <div className="relative w-48">
                <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm SV, MSSV..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-semibold tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">STT</th>
                  <th className="py-3 px-4">Họ và Tên</th>
                  <th className="py-3 px-4">Ảnh</th>
                  <th className="py-3 px-4">Ngày</th>
                  <th className="py-3 px-4">Giờ vào</th>
                  <th className="py-3 px-4">Giờ ra</th>
                  <th className="py-3 px-4">Thời lượng</th>
                  <th className="py-3 px-4 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log: any, idx: number) => (
                    <tr key={log.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-sans">
                        <div className="font-bold text-gray-900">{log.studentName || "Chưa có tên"}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{log.studentCode}</div>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        {log.snapshot ? (
                          <button
                            onClick={() => setPreviewImage(log.snapshot)}
                            className="relative group block"
                            title="Bấm để xem ảnh phóng to"
                          >
                            <img
                              src={log.snapshot}
                              alt="Snapshot"
                              className="h-8 w-8 rounded-lg object-cover border border-gray-200 group-hover:scale-105 transition"
                            />
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(log.dutyDate).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-bold">
                        {log.checkInTime
                          ? new Date(log.checkInTime).toLocaleTimeString("vi-VN")
                          : "--:--"}
                      </td>
                      <td className="py-3 px-4 text-rose-600 font-bold">
                        {log.checkOutTime
                          ? new Date(log.checkOutTime).toLocaleTimeString("vi-VN")
                          : <span className="text-gray-400 font-normal">--:--</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-800 font-semibold">
                        {log.durationText && log.durationText !== "--" ? log.durationText : (log.checkOutTime ? "--" : "Đang trực")}
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        <LogStatusBadge log={log} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-400 font-sans">
                      Không tìm thấy lượt trực nào phù hợp với bộ lọc
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* XÁC NHẬN KHI IN ẤN A4 (TINH GỌN) */}
        <div className="hidden print:flex justify-end pt-8 pr-12 text-xs">
          <div className="text-center">
            <div className="text-gray-500">Ngày in: {new Date().toLocaleDateString("vi-VN")}</div>
            <div className="font-bold mt-2">Người lập bảng</div>
            <div className="mt-14 font-semibold">(Ký và ghi rõ họ tên)</div>
          </div>
        </div>

      </div>

      {/* MODAL 1: ĐIỂM DANH BỔ SUNG THỦ CÔNG (KHI SV QUÊN THẺ) */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowManualModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-4">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-500">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Điểm Danh Bổ Sung Thủ Công</h3>
                <p className="text-xs text-gray-400">Dành cho sinh viên quên mang thẻ hoặc thẻ bị lỗi</p>
              </div>
            </div>

            <form onSubmit={handleManualAttendanceSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-gray-700 font-semibold block mb-1">Mã số sinh viên (MSSV) *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: 2373401010100"
                  value={manualStudentCode}
                  onChange={(e) => setManualStudentCode(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-rose-400 font-mono"
                />
              </div>

              <div>
                <label className="text-gray-700 font-semibold block mb-1">Ngày trực *</label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-rose-400 font-mono"
                />
              </div>

              {/* GỢI Ý CHỌN NHANH KHUNG GIỜ PHÒNG LAB */}
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 space-y-1.5">
                <span className="text-[11px] font-semibold text-gray-500 block">Chọn nhanh khung giờ phòng Lab:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setManualInTime("08:00"); setManualOutTime("12:00"); }}
                    className="px-2.5 py-1 rounded bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-gray-200 text-[11px] font-medium text-gray-700 transition"
                  >
                    Buổi Sáng (08:00 - 12:00)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setManualInTime("13:00"); setManualOutTime("17:00"); }}
                    className="px-2.5 py-1 rounded bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-gray-200 text-[11px] font-medium text-gray-700 transition"
                  >
                    Buổi Chiều (13:00 - 17:00)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-700 font-semibold block mb-1">Giờ vào *</label>
                  <input
                    type="time"
                    required
                    value={manualInTime}
                    onChange={(e) => setManualInTime(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-rose-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-gray-700 font-semibold block mb-1">Giờ ra (tùy chọn)</label>
                  <input
                    type="time"
                    value={manualOutTime}
                    onChange={(e) => setManualOutTime(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-rose-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-700 font-semibold block mb-1">Lý do ghi nhận bổ sung</label>
                <input
                  type="text"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="VD: Quên mang thẻ SV, có xác nhận của GVHD"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white rounded-lg font-semibold transition"
                >
                  {manualSubmitting ? "Đang lưu..." : "Xác nhận điểm danh"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: XEM ẢNH SNAPSHOT WEBCAM PHÓNG TO */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl overflow-hidden max-w-lg w-full p-4 relative space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-rose-500" />
                Ảnh Chụp Xác Thực Khuôn Mặt Từ Camera
              </span>
              <button onClick={() => setPreviewImage(null)} className="text-gray-400 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <img src={previewImage} alt="Face Snapshot Preview" className="w-full rounded-xl object-contain max-h-[70vh]" />
          </div>
        </div>
      )}

      {/* MODAL 3: XEM TOÀN BỘ LỊCH SỬ QUẸT THẺ CHECK-IN / CHECK-OUT CỦA SINH VIÊN */}
      {historyStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-gray-200 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setHistoryStudent(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-4 shrink-0">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-500">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>Nhật Ký Quẹt Thẻ: {historyStudent.fullName}</span>
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 text-rose-600 font-mono text-xs font-bold">
                    {historyStudent.studentCode}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lớp: <strong className="text-gray-800">{historyStudent.className || "DTH-CNTT"}</strong> • Tổng: <strong className="text-rose-600">{historyStudent.totalShifts || 0} lượt</strong>
                </p>
              </div>
            </div>

            {/* BẢNG LỊCH SỬ QUẸT CỦA BẠN NÀY */}
            <div className="overflow-y-auto flex-1 rounded-xl border border-gray-100">
              {(() => {
                const studentLogs = (data?.allLogs || []).filter(
                  (l: any) => l.studentCode === historyStudent.studentCode
                );

                if (studentLogs.length === 0) {
                  return (
                    <div className="py-12 text-center text-xs text-gray-400 font-sans">
                      Sinh viên chưa có lịch sử quẹt thẻ check-in / check-out nào được ghi nhận.
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-semibold tracking-wider sticky top-0 border-b border-gray-100">
                      <tr>
                        <th className="py-2.5 px-3">STT</th>
                        <th className="py-2.5 px-3">Ngày trực</th>
                        <th className="py-2.5 px-3">Khung ca</th>
                        <th className="py-2.5 px-3">Giờ vào</th>
                        <th className="py-2.5 px-3">Giờ ra</th>
                        <th className="py-2.5 px-3">Thời lượng</th>
                        <th className="py-2.5 px-3 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 font-mono">
                      {studentLogs.map((log: any, idx: number) => (
                        <tr key={log.id} className="hover:bg-rose-50/20 transition">
                          <td className="py-2.5 px-3 text-gray-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-sans font-medium text-gray-900">
                            {new Date(log.dutyDate).toLocaleDateString("vi-VN")}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <span className="text-[11px] text-gray-600">
                              {log.shiftName || "Phòng Lab"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-emerald-700 font-bold">
                            {log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString("vi-VN") : "--:--"}
                          </td>
                          <td className="py-2.5 px-3 text-rose-600 font-bold">
                            {log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString("vi-VN") : <span className="text-gray-400 font-normal">--:--</span>}
                          </td>
                          <td className="py-2.5 px-3 text-gray-800 font-medium font-sans">
                            {log.durationText && log.durationText !== "--" ? log.durationText : (log.checkOutTime ? "--" : "Đang trực")}
                          </td>
                          <td className="py-2.5 px-3 text-right font-sans">
                            <LogStatusBadge log={log} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            <div className="pt-3 border-t border-gray-100 mt-4 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setHistoryStudent(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPageView() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "LECTURER",]}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
