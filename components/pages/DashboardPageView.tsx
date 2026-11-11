"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  FileSpreadsheet,
  ArrowLeft,
  Clock,
  UserCheck,
  AlertCircle,
  TrendingUp,
  Download,
  Search,
  Filter,
  Users,
  RefreshCw,
  CheckCircle2,
  Printer,
  PlusCircle,
  X,
  Camera,
  Calendar,
  AlertTriangle,
  Award,
  Eye,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAssetPath } from "@/lib/asset-path";

function DashboardContent() {
  const { user, role } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [datePreset, setDatePreset] = useState<"ALL" | "TODAY" | "7DAYS" | "MONTH">("ALL");
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
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
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

  // XUẤT EXCEL BẢNG CHẤM CÔNG VLU
  // XUẤT FILE EXCEL (.xlsx) CHUẨN 2 SHEET: TỔNG HỢP GIỜ & NHẬT KÝ CHI TIẾT
  const handleExportExcel = () => {
    if (!data || !data.allLogs) return;

    // Sheet 1: Tổng hợp giờ trực theo từng sinh viên
    const studentSummaryData = (data.studentStats || []).map((sv: any, idx: number) => ({
      STT: idx + 1,
      "Họ và tên": sv.fullName,
      MSSV: sv.studentCode,
      "Số ca trực": sv.totalShifts || 0,
      "Ca hoàn thành": sv.completedShifts || 0,
      "Tổng số giờ trực (hrs)": sv.totalHours || 0,
    }));

    // Thêm dòng tổng cộng
    const totalHoursAllStudents = (data.studentStats || []).reduce((acc: number, s: any) => acc + (s.totalHours || 0), 0);
    studentSummaryData.push({
      STT: "" as any,
      "Họ và tên": "TỔNG CỘNG TOÀN BỘ SINH VIÊN",
      MSSV: "",
      "Số ca trực": (data.studentStats || []).reduce((acc: number, s: any) => acc + (s.totalShifts || 0), 0),
      "Ca hoàn thành": (data.studentStats || []).reduce((acc: number, s: any) => acc + (s.completedShifts || 0), 0),
      "Tổng số giờ trực (hrs)": Math.round(totalHoursAllStudents * 10) / 10,
    });

    // Sheet 2: Nhật ký chi tiết các lượt vào - ra
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
      "Thời gian có mặt": log.durationText || "--",
      "Số giờ (hrs)": log.totalHours || 0,
      "Trạng thái": log.checkOutTime ? "Đã về" : "Đang có mặt",
    }));

    const workbook = XLSX.utils.book_new();

    // Thêm Sheet 1
    const wsSummary = XLSX.utils.json_to_sheet(studentSummaryData);
    wsSummary["!cols"] = [
      { wch: 6 },
      { wch: 26 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(workbook, wsSummary, "TongHopGio_SinhVien");

    // Thêm Sheet 2
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
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(workbook, wsDetails, "NhatKy_ChiTiet");

    XLSX.writeFile(
      workbook,
      `VLU_BangTongHopGioTruc_${new Date().toISOString().slice(0, 10)}.xlsx`
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
    const todayStr = now.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const currentMonth = todayStr.slice(0, 7);

    return data.allLogs.filter((log: any) => {


      // 2. Preset thời gian
      const logDate = new Date(log.dutyDate);
      const logDateStr = log.dutyDate ? String(log.dutyDate).slice(0, 10) : "";

      if (datePreset === "TODAY" && logDateStr !== todayStr) return false;
      if (datePreset === "7DAYS" && logDate < sevenDaysAgo) return false;
      if (datePreset === "MONTH" && !logDateStr.startsWith(currentMonth)) return false;

      // 3. Trạng thái
      if (statusFilter === "IN_LAB" && log.checkOutTime) return false;
      if (statusFilter === "CHECKED_OUT" && !log.checkOutTime) return false;

      // 4. Tìm kiếm từ khóa
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches =
          log.studentName.toLowerCase().includes(term) ||
          log.studentCode.includes(term) ||
          log.labName.toLowerCase().includes(term);
        if (!matches) return false;
      }

      return true;
    });
  }, [data, role, user, datePreset, statusFilter, searchTerm]);

  // Lượt quét thẻ mới nhất
  const latestLog = useMemo(() => {
    if (!data?.allLogs || data.allLogs.length === 0) return null;
    return data.allLogs[0];
  }, [data]);

  // Danh sách các lượt quét trong ngày hôm nay
  const todayLogs = useMemo(() => {
    if (!data?.allLogs) return [];
    const todayStr = new Date().toISOString().slice(0, 10);
    return data.allLogs.filter((log: any) => {
      const logDateStr = log.dutyDate ? String(log.dutyDate).slice(0, 10) : "";
      return logDateStr === todayStr;
    });
  }, [data]);

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
                BẢNG QUẢN LÝ ĐIỂM DANH
              </h1>
              <p className="text-xs text-gray-500">
                Khoa Công nghệ Thông tin • Giám sát ra vào &amp; Bảng chấm công
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowManualModal(true)}
              className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Điểm danh thủ công</span>
            </button>

            <button
              onClick={handlePrintReport}
              className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
              title="In Báo Cáo A4 Chuẩn Khoa"
            >
              <Printer className="h-4 w-4 text-gray-500" />
              <span>In A4</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              <span>Xuất Excel</span>
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
          <h2 className="text-xl font-bold uppercase mt-1">BẢNG TỔNG HỢP CÔNG TRỰC XƯỞNG THỰC TẬP</h2>
          <div className="text-xs text-gray-500 mt-1">Ngày lập báo cáo: {new Date().toLocaleDateString("vi-VN")}</div>
        </div>

        {/* THÔNG BÁO HÀNH ĐỘNG */}
        {actionMessage && (
          <div className="print:hidden rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-900 flex items-center gap-2 shadow-xs animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* KHỐI 1: GIÁM SÁT REALTIME - ĐANG CÓ MẶT TẠI XƯỞNG THỰC TẬP */}
        <div className="print:hidden bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                Sinh viên đang có mặt (Live)
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-xs font-bold">
                  {data?.activeInLab?.length || 0} người
                </span>
              </h2>
            </div>
            <span className="text-[11px] text-gray-400">Tự động đồng bộ mỗi 10 giây</span>
          </div>

          {(!data?.activeInLab || data.activeInLab.length === 0) ? (
            <div className="py-6 text-center text-xs text-gray-400">
              Hiện tại không có sinh viên nào trong xưởng. Sinh viên quẹt thẻ tại Laptop Trạm để vào ca!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {data.activeInLab.map((sv: any) => (
                <div
                  key={sv.id}
                  className={`rounded-xl border p-3.5 flex items-center gap-3 shadow-2xs transition ${sv.isStale
                    ? "border-amber-300 bg-amber-50/50"
                    : "border-emerald-200 bg-emerald-50/30"
                    }`}
                >
                  {sv.snapshot ? (
                    <button
                      onClick={() => setPreviewImage(sv.snapshot)}
                      className="relative group shrink-0"
                      title="Xem ảnh camera"
                    >
                      <img
                        src={sv.snapshot}
                        alt="Ảnh vào"
                        className="h-11 w-11 rounded-lg object-cover border border-emerald-300 group-hover:opacity-80 transition"
                      />
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-lg text-white text-[9px]">
                        Xem
                      </span>
                    </button>
                  ) : (
                    <div className="h-11 w-11 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {sv.studentName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-900 text-xs truncate">{sv.studentName}</div>
                    <div className="text-[11px] text-gray-500 font-mono">{sv.studentCode}</div>
                    <div className="mt-1 text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Vào: {new Date(sv.checkInTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} • {sv.duration}
                    </div>
                    {sv.isStale && (
                      <div className="mt-1 text-[10px] text-amber-700 font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                        <span>Quá 5h (Có thể quên quẹt về)</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* KHỐI CHUYỂN TỪ TRANG CHỦ: KẾT QUẢ QUÉT GẦN NHẤT & NHẬT KÝ HÔM NAY */}
        <div className="print:hidden grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* CỘT TRÁI (5 CỘT): KẾT QUẢ LƯỢT QUÉT GẦN NHẤT */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3.5">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-rose-500" />
                  Kết Quả Quét Gần Nhất
                </h3>
                {latestLog && (
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase inline-flex items-center gap-1 ${
                      latestLog.checkOutTime
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {latestLog.checkOutTime ? "ĐÃ CHECK-OUT" : "ĐÃ CHECK-IN"}
                  </span>
                )}
              </div>

              {latestLog ? (
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  {/* Snapshot Image */}
                  <div className="w-24 h-24 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden shrink-0 relative">
                    {latestLog.snapshot ? (
                      <img
                        src={latestLog.snapshot}
                        alt="Ảnh quét"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <Camera className="h-6 w-6 mb-1 text-gray-300" />
                        <span className="text-[10px]">No Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Thông tin SV */}
                  <div className="flex-1 w-full space-y-2 text-xs">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{latestLog.studentName}</h4>
                      <div className="text-gray-500 font-mono mt-0.5">
                        MSSV: <span className="text-rose-600 font-bold">{latestLog.studentCode}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <span className="text-gray-400 block text-[10px]">Giờ vào</span>
                        <span className="text-emerald-700 font-mono font-bold text-xs">
                          {latestLog.checkInTime ? new Date(latestLog.checkInTime).toLocaleTimeString("vi-VN") : "--:--"}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <span className="text-gray-400 block text-[10px]">Giờ ra</span>
                        <span className="text-rose-600 font-mono font-bold text-xs">
                          {latestLog.checkOutTime ? new Date(latestLog.checkOutTime).toLocaleTimeString("vi-VN") : "--:--"}
                        </span>
                      </div>
                    </div>

                    {latestLog.durationText && latestLog.durationText !== "--" && (
                      <div className="text-[11px] font-mono bg-rose-50/60 p-2 rounded-lg border border-rose-100 flex items-center justify-between text-rose-800">
                        <span className="text-gray-500">Thời gian có mặt:</span>
                        <span className="font-bold">{latestLog.durationText}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-gray-400">
                  Chưa có lượt quét thẻ nào được ghi nhận.
                </div>
              )}
            </div>

            <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
              <span>Phương thức: {latestLog?.scanMethod || "Mã vạch"}</span>
              <span>Cập nhật tự động</span>
            </div>
          </div>

          {/* CỘT PHẢI (7 CỘT): BẢNG NHẬT KÝ HÔM NAY */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    Nhật Ký Quét Thẻ Hôm Nay
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-mono">
                    {todayLogs.length} lượt
                  </span>
                </div>
                <button
                  onClick={() => loadDashboard()}
                  className="text-xs text-gray-400 hover:text-rose-500 p-1 rounded-lg hover:bg-gray-50 transition flex items-center gap-1"
                  title="Làm mới"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-rose-500" : ""}`} />
                  <span className="text-[11px]">Làm mới</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-[220px] overflow-y-auto rounded-xl border border-gray-100">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-semibold tracking-wider sticky top-0 border-b border-gray-100 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Sinh viên</th>
                      <th className="py-2.5 px-3">Giờ vào</th>
                      <th className="py-2.5 px-3">Giờ ra</th>
                      <th className="py-2.5 px-3">Thời gian</th>
                      <th className="py-2.5 px-3 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-mono">
                    {todayLogs.length > 0 ? (
                      todayLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-rose-50/20 transition">
                          <td className="py-2.5 px-3 font-sans">
                            <div className="font-bold text-gray-900 text-xs">{log.studentName}</div>
                            <div className="text-[11px] text-gray-400 font-mono">{log.studentCode}</div>
                          </td>
                          <td className="py-2.5 px-3 text-emerald-700 font-bold text-xs">
                            {log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString("vi-VN") : "--:--"}
                          </td>
                          <td className="py-2.5 px-3 text-rose-600 font-bold text-xs">
                            {log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString("vi-VN") : <span className="text-gray-400 font-normal">--:--</span>}
                          </td>
                          <td className="py-2.5 px-3 text-gray-800 font-medium text-xs">
                            {log.durationText || "--"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-sans">
                            {log.checkOutTime ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                                Đã về
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Có mặt
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400 font-sans text-xs">
                          Chưa có lượt quét nào trong ngày hôm nay
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2.5 mt-2 border-t border-gray-100 text-right">
              <span className="text-[11px] text-gray-400">Xem tất cả lịch sử tại bảng chi tiết bên dưới</span>
            </div>
          </div>
        </div>

        {/* KHỐI 2: 5 THẺ KPI THỐNG KÊ CHUYÊN SÂU */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 1. Tổng giờ */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="text-[11px] font-semibold text-gray-500 uppercase truncate">Tổng giờ tích lũy</div>
            <div className="text-xl font-bold text-rose-500 font-mono mt-1">
              {data?.stats?.totalHours || 0} <span className="text-xs text-gray-400 font-normal">hrs</span>
            </div>
          </div>

          {/* 2. Tổng sinh viên */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="text-[11px] font-semibold text-gray-500 uppercase truncate">Sinh viên tham gia</div>
            <div className="text-xl font-bold text-gray-800 font-mono mt-1">
              {data?.stats?.totalStudents || 0} <span className="text-xs text-gray-400 font-normal">người</span>
            </div>
          </div>

          {/* 3. Lượt quét */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="text-[11px] font-semibold text-gray-500 uppercase truncate">Tổng lượt quét</div>
            <div className="text-xl font-bold text-gray-800 font-mono mt-1">
              {data?.stats?.totalLogs || 0} <span className="text-xs text-gray-400 font-normal">lượt</span>
            </div>
          </div>

          {/* 4. TB mỗi ca */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="text-[11px] font-semibold text-gray-500 uppercase truncate">TB mỗi lượt</div>
            <div className="text-xl font-bold text-emerald-600 font-mono mt-1">
              {data?.stats?.avgHours || 0} <span className="text-xs text-gray-400 font-normal">hrs</span>
            </div>
          </div>

          {/* 5. Tỷ lệ hoàn thành */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="text-[11px] font-semibold text-gray-500 uppercase truncate">Hoàn thành ca</div>
            <div className="text-xl font-bold text-blue-600 font-mono mt-1">
              {data?.stats?.completionRate || 100}%
            </div>
          </div>
        </div>

        {/* THÔNG TIN KHUNG GIỜ LÀM VIỆC XƯỞNG THỰC TẬP KHOA CNTT */}
        <div className="print:hidden bg-gradient-to-r from-red-50/70 via-white to-amber-50/60 rounded-2xl border border-red-100 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 bg-red-600 text-white rounded-md font-bold text-[11px] tracking-wide">VLU</span>
            <span className="font-bold text-gray-800">Xưởng Thực Tập - Khoa Công Nghệ Thông Tin:</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-gray-600">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Thời gian làm việc: <strong>Từ Thứ 2 – Thứ 7</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span>
              <span><strong>Sáng: 08:00 – 12:00</strong> | <strong>Chiều: 13:00 – 17:00</strong></span>
            </div>
          </div>
        </div>

        {/* KHỐI 3: 2 BIỂU ĐỒ PHÂN TÍCH SỐ LIỆU CHUYÊN SÂU */}
        <div className="print:hidden grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Biểu đồ 1: Số ca trực theo Sinh viên */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-rose-500" />
              Tổng Số Ca Trực Từng Sinh Viên (Ca)
            </h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.studentStats || []}>
                  <XAxis dataKey="fullName" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "10px",
                    }}
                  />
                  <Bar dataKey="totalShifts" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Số ca trực" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Biểu đồ 2: Phân Bổ Số Người Trực Theo Ngày Làm Việc Trong Tuần */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Số Người Trực Các Ngày Trong Tuần (Người)
            </h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.weekdayData || []}>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "10px",
                    }}
                  />
                  <Bar dataKey="peopleCount" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Số người trực" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* KHỐI 4: BẢNG CHẤM CÔNG CHI TIẾT CA SÁNG / CA CHIỀU */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Award className="h-4 w-4 text-rose-500" />
                Bảng Chấm Công Chi Tiết Ca Sáng / Ca Chiều
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Xưởng Thực Tập Khoa CNTT • Thống kê ca sáng (08h00 - 12h00) và ca chiều (13h00 - 17h00)
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
                  <th className="py-3 px-4">Sinh viên</th>
                  <th className="py-3 px-4">Lớp</th>
                  <th className="py-3 px-4 text-center">
                    Ca Sáng
                    <div className="text-[9px] font-normal lowercase text-gray-400">(08:00 - 12:00)</div>
                  </th>
                  <th className="py-3 px-4 text-center">
                    Ca Chiều
                    <div className="text-[9px] font-normal lowercase text-gray-400">(13:00 - 17:00)</div>
                  </th>
                  <th className="py-3 px-4 text-center">Tổng ca hoàn thành</th>
                  <th className="py-3 px-4 text-right">Quy đổi số giờ</th>
                  <th className="py-3 px-4 text-right">Lịch sử quẹt thẻ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {data?.studentStats?.map((sv: any, idx: number) => (
                  <tr key={sv.id} className="hover:bg-gray-50/80 transition">
                    <td className="py-3.5 px-4 text-gray-400">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-bold text-gray-900">{sv.fullName}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{sv.studentCode}</div>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium text-[11px]">
                        {sv.className || "DTH-CNTT"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-xs">
                        {sv.morningShifts || 0} ca
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs">
                        {sv.afternoonShifts || 0} ca
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-900 text-sm">
                      {sv.completedShifts || 0} <span className="text-gray-400 font-normal text-xs">/ {sv.totalShifts} ca</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-600 text-sm">
                      {sv.totalHours} <span className="text-gray-400 font-normal text-[11px]">hrs</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      <button
                        onClick={() => setHistoryStudent(sv)}
                        className="px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-rose-50 text-gray-700 hover:text-rose-600 border border-gray-200 hover:border-rose-200 text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-2xs"
                        title="Xem toàn bộ lịch sử quẹt thẻ check-in / check-out"
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

        {/* KHỐI 5: BẢNG NHẬT KÝ CHI TIẾT CÁC LƯỢT RA - VÀO */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-rose-500" />
                Nhật Ký Điểm Danh
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
                  <option value="IN_LAB">Đang có mặt</option>
                  <option value="CHECKED_OUT">Đã về</option>
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
                  <th className="py-3 px-4">Sinh viên</th>
                  <th className="py-3 px-4">Ảnh</th>
                  <th className="py-3 px-4">Ngày</th>
                  <th className="py-3 px-4">Giờ vào</th>
                  <th className="py-3 px-4">Giờ ra</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log: any, idx: number) => (
                    <tr key={log.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-sans">
                        <div className="font-bold text-gray-900">{log.studentName}</div>
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
                        {log.durationText || "--"}
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        {log.checkOutTime ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                            Đã về
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Đang có mặt
                          </span>
                        )}
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

              {/* GỢI Ý CHỌN NHANH CA LÀM VIỆC CHUẨN XƯỞNG THỰC TẬP */}
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 space-y-1.5">
                <span className="text-[11px] font-semibold text-gray-500 block">Chọn nhanh ca làm việc Xưởng Thực tập:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setManualInTime("08:00"); setManualOutTime("12:00"); }}
                    className="px-2.5 py-1 rounded bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-gray-200 text-[11px] font-medium text-gray-700 transition"
                  >
                    Ca Sáng (08:00 - 12:00)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setManualInTime("13:00"); setManualOutTime("17:00"); }}
                    className="px-2.5 py-1 rounded bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-gray-200 text-[11px] font-medium text-gray-700 transition"
                  >
                    Ca Chiều (13:00 - 17:00)
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
                  Lớp: <strong className="text-gray-800">{historyStudent.className || "DTH-CNTT"}</strong> • Ca Sáng: <strong className="text-amber-600">{historyStudent.morningShifts || 0} ca</strong> • Ca Chiều: <strong className="text-blue-600">{historyStudent.afternoonShifts || 0} ca</strong> • Tích lũy: <strong className="text-rose-600">{historyStudent.totalHours} hrs</strong>
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
                        <th className="py-2.5 px-3">Thời gian</th>
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
                              {log.shiftName || "Ca trực"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-emerald-700 font-bold">
                            {log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString("vi-VN") : "--:--"}
                          </td>
                          <td className="py-2.5 px-3 text-rose-600 font-bold">
                            {log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString("vi-VN") : <span className="text-gray-400 font-normal">--:--</span>}
                          </td>
                          <td className="py-2.5 px-3 text-gray-800 font-medium font-sans">
                            {log.durationText || "--"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-sans">
                            {log.checkOutTime ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                                Đã về
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Đang trực
                              </span>
                            )}
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
