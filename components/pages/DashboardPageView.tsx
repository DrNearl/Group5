"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
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
  Eye,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAssetPath } from "@/lib/asset-path";
import { LAB_TIMEZONE, getLabDateKey } from "@/lib/attendance-rules";

function isCrossDayLog(log: any): boolean {
  if (!log?.checkInTime || !log?.checkOutTime) return false;
  return getLabDateKey(new Date(log.checkInTime)) !== getLabDateKey(new Date(log.checkOutTime));
}

function formatLabDate(value: string | Date): string {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LAB_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${values.day}/${values.month}/${values.year}`;
}

function formatLabTime(value: string | Date): string {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LAB_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${values.hour}:${values.minute}:${values.second}`;
}

function formatLabDateTime(value: string | Date): string {
  const date = new Date(value);
  return `${formatLabDate(date).slice(0, 5)} ${formatLabTime(date)}`;
}

function getLogStatusLabel(log: any, t: any): string {
  if (log?.attendanceStatus === "MISSING_CHECKOUT") return t.dashboard.missingCheckout;
  if (!log?.checkOutTime) return t.dashboard.inLab;
  if (!log?.isValidSession) return t.dashboard.needsReview;
  return t.dashboard.completed;
}

function getLogDurationLabel(log: any): string {
  if (log?.isValidSession) {
    return log.durationText && log.durationText !== "--" ? log.durationText : "—";
  }
  return "—";
}

function getLogCheckOutLabel(log: any): string {
  if (log?.attendanceStatus === "MISSING_CHECKOUT" || !log?.checkOutTime) return "—";
  return isCrossDayLog(log) ? formatLabDateTime(log.checkOutTime) : formatLabTime(log.checkOutTime);
}

function getLogDurationHint(log: any, t: any): string | undefined {
  if (log?.isValidSession) return undefined;
  if (log?.attendanceStatus === "MISSING_CHECKOUT") {
    return t.dashboard.missingCheckoutDurationHint;
  }
  if (!log?.checkOutTime) return t.dashboard.openSessionDurationHint;
  return t.dashboard.invalidSessionDurationHint;
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
  const { t } = useLanguage();
  if (log?.attendanceStatus === "MISSING_CHECKOUT") {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
        {t.dashboard.missingCheckout}
      </span>
    );
  }
  if (!log?.checkOutTime) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        {t.dashboard.inLab}
      </span>
    );
  }
  if (!log?.isValidSession) {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full border border-amber-200 bg-amber-50/70 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
        {t.dashboard.needsReview}
      </span>
    );
  }
  return (
    <span className="inline-flex whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
      {t.dashboard.completed}
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
  const [activeTab, setActiveTab] = useState<"logs" | "students">("logs");
  const [studentFilter, setStudentFilter] = useState<string | null>(null);
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
      "Ngày trực": formatLabDate(log.checkInTime || log.dutyDate),
      "Giờ vào": log.checkInTime ? formatLabTime(log.checkInTime) : "—",
      "Giờ ra": getLogCheckOutLabel(log),
      "Thời lượng": getLogDurationLabel(log),
      "Trạng thái": getLogStatusLabel(log, t),
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
      if (statusFilter === "MISSING_CHECKOUT" && log.attendanceStatus !== "MISSING_CHECKOUT") return false;

      if (studentFilter && log.studentCode !== studentFilter) return false;

      // 4. Tìm kiếm từ khóa
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches =
          (log.studentName || "").toLowerCase().includes(term) ||
          String(log.studentCode || "").toLowerCase().includes(term) ||
          String(log.labName || "").toLowerCase().includes(term);
        if (!matches) return false;
      }

      return true;
    });
  }, [data, datePreset, statusFilter, searchTerm, studentFilter]);

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

  const filteredStudentStats = useMemo(() => {
    const counts = new Map<string, { count: number; name: string }>();
    const studentLogs = (data?.allLogs || []).filter((log: any) => {
      if (statusFilter === "IN_LAB" && log.checkOutTime) return false;
      if (statusFilter === "CHECKED_OUT" && !log.checkOutTime) return false;
      if (studentFilter && log.studentCode !== studentFilter) return false;

      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        (log.studentName || "").toLowerCase().includes(term) ||
        String(log.studentCode || "").toLowerCase().includes(term) ||
        String(log.labName || "").toLowerCase().includes(term)
      );
    });

    studentLogs.forEach((log: any) => {
      const code = String(log.studentCode || "");
      if (!code) return;
      const current = counts.get(code);
      counts.set(code, { count: (current?.count || 0) + 1, name: current?.name || log.studentName || "" });
    });

    const studentByCode = new Map<string, any>(
      (data?.studentStats || []).map((student: any) => [String(student.studentCode), student])
    );

    return Array.from(counts.entries()).map(([studentCode, summary]) => {
      const student = studentByCode.get(studentCode);
      return {
        id: student?.id || studentCode,
        studentCode,
        fullName: student?.fullName || summary.name,
        className: student?.className || "DTH-CNTT",
        totalShifts: summary.count,
      };
    });
  }, [data, statusFilter, searchTerm, studentFilter]);

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
        <section aria-label={t.dashboard.summaryTitle} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: t.dashboard.presentCount, value: data?.activeInLab?.length || 0, tone: "text-emerald-700", live: true, today: false },
            { label: t.dashboard.todayLogsCount, value: todayLogs.length, tone: "text-gray-900", live: false, today: true },
            { label: t.dashboard.todayStudentsCount, value: todayStudentCount, tone: "text-gray-900", live: false, today: true },
            { label: t.dashboard.needsAttention, value: data?.stats?.missingCheckoutCount || 0, tone: (data?.stats?.missingCheckoutCount || 0) > 0 ? "text-amber-700" : "text-gray-700", live: false, today: false },
          ].map((kpi) => {
            const content = <>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                {kpi.live && <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />}
                <span>{kpi.label}</span>
                {kpi.today && <span className="text-gray-500">· {t.dashboard.todayLabel}</span>}
              </div>
              {loading && !data ? (
                <div className="mt-2 h-7 w-16 animate-pulse rounded bg-gray-100" />
              ) : (
                <div className={"mt-1 font-mono text-2xl font-bold " + kpi.tone}>{kpi.value}</div>
              )}
            </>;
            const className = "rounded-xl border border-gray-200 bg-white p-4 text-left shadow-xs";
            if (kpi.label === t.dashboard.needsAttention) {
              return <button key={kpi.label} type="button" className={className} onClick={() => {
                setStatusFilter("MISSING_CHECKOUT");
                setDatePreset("ALL");
                setStudentFilter(null);
                setSearchTerm("");
                setActiveTab("logs");
              }}>{content}</button>;
            }
            return <div key={kpi.label} className={className}>{content}</div>;
          })}
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
                    <div className="mt-0.5 font-mono text-gray-600">{t.dashboard.studentCodeLabel}: <span className="font-bold text-gray-800">{latestLog.studentCode}</span></div>
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
        {/* SINGLE HISTORY CARD */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs sm:p-5 print:break-inside-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Clock className="h-4 w-4 text-rose-500" />
              {t.dashboard.historyTitle}
            </h2>
            <div className="print:hidden inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "logs"}
                onClick={() => setActiveTab("logs")}
                className={"rounded-md px-3 py-1.5 text-xs font-semibold transition " + (activeTab === "logs" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-600 hover:text-gray-900")}
              >
                {t.dashboard.historyLogsTab}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "students"}
                onClick={() => setActiveTab("students")}
                className={"rounded-md px-3 py-1.5 text-xs font-semibold transition " + (activeTab === "students" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-600 hover:text-gray-900")}
              >
                {t.dashboard.historyStudentsTab}
              </button>
            </div>
          </div>

          <div className="print:hidden space-y-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {activeTab === "logs" && (
                <div className="inline-flex max-w-full flex-wrap rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs">
                  <button type="button" onClick={() => setDatePreset("TODAY")} className={"rounded-md px-2.5 py-1.5 transition " + (datePreset === "TODAY" ? "bg-white font-semibold text-gray-900 shadow-2xs" : "text-gray-600 hover:text-gray-900")}>{t.dashboard.today}</button>
                  <button type="button" onClick={() => setDatePreset("7DAYS")} className={"rounded-md px-2.5 py-1.5 transition " + (datePreset === "7DAYS" ? "bg-white font-semibold text-gray-900 shadow-2xs" : "text-gray-600 hover:text-gray-900")}>{t.dashboard.days7}</button>
                  <button type="button" onClick={() => setDatePreset("MONTH")} className={"rounded-md px-2.5 py-1.5 transition " + (datePreset === "MONTH" ? "bg-white font-semibold text-gray-900 shadow-2xs" : "text-gray-600 hover:text-gray-900")}>{t.dashboard.month}</button>
                  <button type="button" onClick={() => setDatePreset("ALL")} className={"rounded-md px-2.5 py-1.5 transition " + (datePreset === "ALL" ? "bg-white font-semibold text-gray-900 shadow-2xs" : "text-gray-600 hover:text-gray-900")}>{t.dashboard.all}</button>
                </div>
              )}

              <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <input
                  type="search"
                  placeholder={t.dashboard.searchPlaceholder}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-xs text-gray-800 placeholder-gray-500 focus:border-rose-400 focus:outline-none"
                />
              </div>

              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <select
                  aria-label={t.dashboard.allStatuses}
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-9 min-w-40 appearance-none rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-8 text-xs text-gray-800 focus:border-rose-400 focus:outline-none"
                >
                  <option value="ALL">{t.dashboard.allStatuses}</option>
                  <option value="IN_LAB">{t.dashboard.inLab}</option>
                  <option value="CHECKED_OUT">{t.dashboard.completed}</option>
                  <option value="MISSING_CHECKOUT">{t.dashboard.missingCheckout}</option>
                </select>
              </div>
            </div>

            {studentFilter && (
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-gray-800">
                <span>{t.dashboard.selectedStudentFilter}: <strong>{studentFilter}</strong></span>
                <button type="button" onClick={() => setStudentFilter(null)} className="font-semibold text-rose-700 underline underline-offset-2">
                  {t.dashboard.clearStudentFilter}
                </button>
              </div>
            )}
          </div>

          <div className={activeTab === "logs" ? "print:hidden" : "hidden print:hidden"}>
            {loading && !data ? (
              <div className="space-y-2 py-4">
                <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
                <div className="h-10 animate-pulse rounded-lg bg-gray-50" />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full min-w-[760px] text-left text-xs text-gray-700">
                  <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="px-3 py-3">{t.dashboard.rowNumber}</th>
                      <th className="px-3 py-3">{t.dashboard.studentNameColumn}</th>
                      <th className="px-3 py-3">{t.dashboard.photoColumn}</th>
                      <th className="px-3 py-3">{t.dashboard.dateColumn}</th>
                      <th className="px-3 py-3">{t.dashboard.checkInTime}</th>
                      <th className="px-3 py-3">{t.dashboard.checkOutTime}</th>
                      <th className="px-3 py-3">{t.dashboard.duration}</th>
                      <th className="w-36 whitespace-nowrap px-3 py-3 text-center">{t.dashboard.statusColumn}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLogs.length > 0 ? filteredLogs.map((log: any, index: number) => (
                      <tr key={log.id} className="hover:bg-gray-50/80">
                        <td className="px-3 py-3 text-gray-600">{index + 1}</td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-gray-900">{log.studentName || t.dashboard.unnamedStudent}</div>
                          <div className="font-mono text-xs text-gray-600">{log.studentCode}</div>
                        </td>
                        <td className="px-3 py-3">
                          {log.snapshot ? (
                            <button type="button" onClick={() => setPreviewImage(log.snapshot)} className="group block" title={t.dashboard.viewPhoto}>
                              <img src={log.snapshot} alt={t.dashboard.scanPhoto} className="h-10 w-10 rounded-lg border border-gray-200 object-cover transition group-hover:scale-105" />
                            </button>
                          ) : <span className="text-xs text-gray-500">—</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-gray-700">{formatLabDate(log.checkInTime || log.dutyDate)}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-mono font-semibold text-emerald-700">{log.checkInTime ? formatLabTime(log.checkInTime) : "—"}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-mono font-semibold text-gray-700">{getLogCheckOutLabel(log)}</td>
                        <td title={getLogDurationHint(log, t)} className="whitespace-nowrap px-3 py-3 font-medium text-gray-800">{getLogDurationLabel(log)}</td>
                        <td className="w-36 whitespace-nowrap px-3 py-3 text-center"><LogStatusBadge log={log} /></td>
                      </tr>
                    )) : (
                      <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-gray-600">{t.dashboard.noFilteredLogs}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-right text-xs text-gray-600">
              {t.dashboard.showing} <strong>{filteredLogs.length}</strong> {t.dashboard.ofTotal} <strong>{data?.allLogs?.length || 0}</strong> {t.dashboard.logCountUnit}
            </p>
          </div>

          <div className={activeTab === "students" ? "print:hidden" : "hidden print:hidden"}>
            {loading && !data ? (
              <div className="space-y-2 py-4">
                <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
                <div className="h-10 animate-pulse rounded-lg bg-gray-50" />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full min-w-[620px] text-left text-xs text-gray-700">
                  <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="px-3 py-3">{t.dashboard.rowNumber}</th>
                      <th className="px-3 py-3">{t.dashboard.studentNameColumn}</th>
                      <th className="px-3 py-3">{t.dashboard.classColumn}</th>
                      <th className="px-3 py-3 text-center">{t.dashboard.totalShifts}</th>
                      <th className="px-3 py-3 text-right">{t.dashboard.detailsColumn}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStudentStats.length > 0 ? filteredStudentStats.map((student: any, index: number) => (
                      <tr key={student.id} className="hover:bg-gray-50/80">
                        <td className="px-3 py-3 text-gray-600">{index + 1}</td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-gray-900">{student.fullName || t.dashboard.unnamedStudent}</div>
                          <div className="font-mono text-xs text-gray-600">{student.studentCode}</div>
                        </td>
                        <td className="px-3 py-3 text-gray-700">{student.className}</td>
                        <td className="px-3 py-3 text-center font-semibold text-gray-900">{student.totalShifts}</td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm("");
                              setDatePreset("ALL");
                              setStatusFilter("ALL");
                              setStudentFilter(student.studentCode);
                              setActiveTab("logs");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {t.dashboard.viewLog}
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-gray-600">{t.dashboard.noFilteredStudents}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-right text-xs text-gray-600">
              {t.dashboard.showing} <strong>{filteredStudentStats.length}</strong> {t.dashboard.studentCountUnit}
            </p>
          </div>

          {/* PRINT ALL RECORDS AND BOTH TABLES REGARDLESS OF ACTIVE TAB */}
          <div className="hidden print:block">
            <section className="mb-6 print:break-inside-auto">
              <h3 className="mb-2 text-sm font-bold text-gray-900">{t.dashboard.studentsTableTitle}</h3>
              <div className="overflow-visible">
                <table className="w-full text-left text-xs text-gray-800">
                  <thead className="border-b border-gray-300 bg-gray-100 text-[11px] font-semibold text-gray-800">
                    <tr>
                      <th className="px-2 py-2">{t.dashboard.rowNumber}</th>
                      <th className="px-2 py-2">{t.dashboard.studentNameColumn}</th>
                      <th className="px-2 py-2">{t.dashboard.studentCodeLabel}</th>
                      <th className="px-2 py-2">{t.dashboard.classColumn}</th>
                      <th className="px-2 py-2">{t.dashboard.totalShifts}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.studentStats || []).map((student: any, index: number) => (
                      <tr key={student.id || student.studentCode} className="border-b border-gray-200">
                        <td className="px-2 py-1.5">{index + 1}</td>
                        <td className="px-2 py-1.5">{student.fullName || t.dashboard.unnamedStudent}</td>
                        <td className="px-2 py-1.5 font-mono">{student.studentCode}</td>
                        <td className="px-2 py-1.5">{student.className || "DTH-CNTT"}</td>
                        <td className="px-2 py-1.5">{student.totalShifts || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="print:break-inside-auto">
              <h3 className="mb-2 text-sm font-bold text-gray-900">{t.dashboard.logsTableTitle}</h3>
              <div className="overflow-visible">
                <table className="w-full text-left text-xs text-gray-800">
                  <thead className="border-b border-gray-300 bg-gray-100 text-[11px] font-semibold text-gray-800">
                    <tr>
                      <th className="px-2 py-2">{t.dashboard.rowNumber}</th>
                      <th className="px-2 py-2">{t.dashboard.studentNameColumn}</th>
                      <th className="px-2 py-2">{t.dashboard.studentCodeLabel}</th>
                      <th className="px-2 py-2">{t.dashboard.dateColumn}</th>
                      <th className="px-2 py-2">{t.dashboard.checkInTime}</th>
                      <th className="px-2 py-2">{t.dashboard.checkOutTime}</th>
                      <th className="px-2 py-2">{t.dashboard.duration}</th>
                      <th className="px-2 py-2">{t.dashboard.statusColumn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.allLogs || []).map((log: any, index: number) => (
                      <tr key={log.id} className="border-b border-gray-200">
                        <td className="px-2 py-1.5">{index + 1}</td>
                        <td className="px-2 py-1.5">{log.studentName || t.dashboard.unnamedStudent}</td>
                        <td className="px-2 py-1.5 font-mono">{log.studentCode}</td>
                        <td className="px-2 py-1.5">{formatLabDate(log.checkInTime || log.dutyDate)}</td>
                        <td className="px-2 py-1.5">{log.checkInTime ? formatLabTime(log.checkInTime) : "—"}</td>
                        <td className="px-2 py-1.5">{getLogCheckOutLabel(log)}</td>
                        <td title={getLogDurationHint(log, t)} className="px-2 py-1.5">{getLogDurationLabel(log)}</td>
                        <td className="whitespace-nowrap px-2 py-1.5"><LogStatusBadge log={log} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
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
                {t.dashboard.photoPreviewTitle}
              </span>
              <button onClick={() => setPreviewImage(null)} aria-label={t.dashboard.close} className="text-gray-400 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>
              <img src={previewImage} alt={t.dashboard.scanPhoto} className="w-full rounded-xl object-contain max-h-[70vh]" />
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
