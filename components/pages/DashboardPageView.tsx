"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
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
  LogOut,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";

function DashboardContent() {
  const { user, role } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard");
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
      const res = await fetch("/api/attendance/scan", {
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

  // XUẤT EXCEL BẢNG CHẤM CÔNG VLU LAB BẰNG SHEETJS (XLSX)
  const handleExportExcel = () => {
    if (!data || !data.allLogs) return;

    // Chuẩn bị dữ liệu định dạng bảng tính
    const worksheetData = data.allLogs.map((log: any, idx: number) => ({
      STT: idx + 1,
      "Họ và Tên SV": log.studentName,
      MSSV: log.studentCode,
      "Ngày trực": new Date(log.dutyDate).toLocaleDateString("vi-VN"),
      "Ca trực": log.shiftName,
      "Phòng Lab": log.labName,
      "Giờ Check-in": log.checkInTime
        ? new Date(log.checkInTime).toLocaleTimeString("vi-VN")
        : "--:--",
      "Giờ Check-out": log.checkOutTime
        ? new Date(log.checkOutTime).toLocaleTimeString("vi-VN")
        : "Đang trong Lab",
      "Thời gian có mặt": log.durationText || "--",
      "Số giờ quy đổi": log.totalHours || 0,
      "Trạng thái":
        log.attendanceStatus === "ON_TIME"
          ? "Đúng giờ"
          : log.attendanceStatus === "LATE"
          ? "Đi trễ"
          : log.attendanceStatus,
      "Phương thức quét": log.scanMethod === "WEBCAM" ? "Webcam AI" : "Súng quét USB",
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ChamCongLabVLU");

    // Tự động điều chỉnh độ rộng cột
    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 28 },
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
    ];

    XLSX.writeFile(
      workbook,
      `VLU_BangChamCong_Lab_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const pieColors = ["#10b981", "#f59e0b", "#ef4444"];
  const pieData = [
    { name: "Đúng giờ", value: data?.stats?.onTimeCount || 0 },
    { name: "Đi trễ", value: data?.stats?.lateCount || 0 },
  ];

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
                <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                GIÁM SÁT TRỰC PHÒNG LAB & XUẤT BẢNG CHẤM CÔNG
              </h1>
              <p className="text-xs text-gray-500">
                Theo dõi sinh viên đang có mặt trong phòng Lab theo thời gian thực và tổng hợp giờ trực VLU
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadDashboard()}
              className="p-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Download className="h-4 w-4" />
              Xuất Excel Bảng Chấm Công (.xlsx)
            </button>
          </div>
        </header>

        {/* THÔNG BÁO HÀNH ĐỘNG THÀNH CÔNG */}
        {actionMessage && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center gap-2 shadow-sm animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* KHỐI 1: SINH VIÊN ĐANG CÓ MẶT TRONG PHÒNG LAB (LIVE REALTIME) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                Sinh viên Đang Có Mặt trong Phòng Lab (Live)
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">
                  {data?.activeInLab?.length || 0} đang trực
                </span>
              </h2>
            </div>
            <span className="text-[11px] text-gray-500 hidden sm:inline">Tự động đồng bộ mỗi 10 giây</span>
          </div>

          {(!data?.activeInLab || data.activeInLab.length === 0) ? (
            <div className="py-6 text-center text-xs text-gray-500">
              Hiện tại chưa có sinh viên nào trong phòng Lab. Sinh viên chỉ cần quẹt thẻ tại Trạm Laptop để vào ca!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {data.activeInLab.map((sv: any) => (
                <div
                  key={sv.id}
                  className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 flex items-start justify-between gap-3 shadow-2xs hover:border-emerald-300 transition"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {sv.snapshot ? (
                      <img
                        src={sv.snapshot}
                        alt="Ảnh check-in"
                        className="h-11 w-11 rounded-lg object-cover border border-emerald-300 shrink-0"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {sv.studentName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 text-xs truncate">{sv.studentName}</div>
                      <div className="text-[11px] text-gray-600 font-mono">{sv.studentCode}</div>
                      <div className="mt-1 text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Vào: {new Date(sv.checkInTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} • {sv.duration}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleForceCheckout(sv.id, sv.studentName)}
                    className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg text-[11px] font-bold shrink-0 transition shadow-2xs"
                    title="Check-out giúp nếu sinh viên quên quẹt thẻ lúc về"
                  >
                    Check-out
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4 THẺ THỐNG KÊ (KPI METRICS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Tổng giờ trực tích lũy</div>
              <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">
                {data?.stats?.totalHours || 0} hrs
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Tổng số lượt quét</div>
              <div className="text-2xl font-bold text-gray-900 font-mono mt-1">
                {data?.stats?.totalLogs || 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <UserCheck className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Lượt check-in đúng giờ</div>
              <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">
                {data?.stats?.onTimeCount || 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Sự cố máy tính đang mở</div>
              <div className="text-2xl font-bold text-rose-600 font-mono mt-1">
                {data?.stats?.openIncidents || 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertCircle className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* BIỂU ĐỒ RECHARTS (2 CỘT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Biểu đồ cột tổng số giờ trực theo sinh viên */}
          <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">
              Biểu đồ: Tổng số giờ trực của từng sinh viên (Hours)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.studentStats || []}>
                  <XAxis dataKey="fullName" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    labelStyle={{ color: "#0f172a", fontWeight: "bold" }}
                  />
                  <Bar dataKey="totalHours" fill="#dc2626" radius={[6, 6, 0, 0]} name="Số giờ trực" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cột phải: Tỷ lệ Đúng giờ vs Đi trễ */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center">
            <h3 className="text-sm font-bold text-gray-900 mb-2 self-start uppercase tracking-wide">
              Tỷ lệ Kỷ luật Điểm danh
            </h3>
            <div className="h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* BẢNG TỔNG HỢP THEO SINH VIÊN */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
            Bảng thống kê ca trực theo Sinh viên
          </h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3">Họ và Tên SV</th>
                  <th className="py-2.5 px-3">MSSV</th>
                  <th className="py-2.5 px-3">Số ca phân công</th>
                  <th className="py-2.5 px-3">Đã hoàn thành</th>
                  <th className="py-2.5 px-3">Đúng giờ</th>
                  <th className="py-2.5 px-3">Đi trễ</th>
                  <th className="py-2.5 px-3 text-right">Tổng giờ trực</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {data?.studentStats?.map((sv: any) => (
                  <tr key={sv.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-sans font-semibold text-gray-900">
                      {sv.fullName}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">{sv.studentCode}</td>
                    <td className="py-2.5 px-3 text-gray-700">{sv.totalShifts}</td>
                    <td className="py-2.5 px-3 text-gray-700">{sv.completedShifts}</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-semibold">{sv.onTime}</td>
                    <td className="py-2.5 px-3 text-amber-600 font-semibold">{sv.late}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-red-600">
                      {sv.totalHours} hrs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* BẢNG CHI TIẾT TỪNG LƯỢT ĐIỂM DANH CHECK-IN / CHECK-OUT */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600" />
                Nhật ký Chi tiết Các lượt Điểm danh Vào - Ra Phòng Lab
              </h3>
              <p className="text-xs text-gray-500">
                Hiển thị thời gian check-in, check-out và tổng thời lượng có mặt chính xác
              </p>
            </div>

            {/* Tìm kiếm & Lọc trạng thái */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-56">
                <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm SV, MSSV, phòng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs">
                <Filter className="h-3.5 w-3.5 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-gray-800 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="IN_LAB">Đang có mặt trong Lab</option>
                  <option value="CHECKED_OUT">Đã Check-out</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3">STT</th>
                  <th className="py-2.5 px-3">Sinh viên</th>
                  <th className="py-2.5 px-3">Ngày</th>
                  <th className="py-2.5 px-3">Giờ Check-in</th>
                  <th className="py-2.5 px-3">Giờ Check-out</th>
                  <th className="py-2.5 px-3">Thời gian có mặt</th>
                  <th className="py-2.5 px-3">Phòng Lab</th>
                  <th className="py-2.5 px-3">Phương thức</th>
                  <th className="py-2.5 px-3 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {data?.allLogs
                  ?.filter((log: any) => {
                    // Nếu là sinh viên, chỉ xem lịch sử điểm danh của bản thân
                    if (role === "STUDENT" && user && log.studentCode !== user.studentCode) {
                      return false;
                    }

                    const matchesSearch =
                      log.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      log.studentCode.includes(searchTerm) ||
                      log.labName.toLowerCase().includes(searchTerm.toLowerCase());

                    const matchesStatus =
                      statusFilter === "ALL" ||
                      (statusFilter === "IN_LAB" && !log.checkOutTime) ||
                      (statusFilter === "CHECKED_OUT" && !!log.checkOutTime);

                    return matchesSearch && matchesStatus;
                  })
                  .map((log: any, idx: number) => (
                    <tr key={log.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-2.5 px-3 text-gray-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-semibold text-gray-900">{log.studentName}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{log.studentCode}</div>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500">
                        {new Date(log.dutyDate).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-700 font-semibold">
                        {log.checkInTime
                          ? new Date(log.checkInTime).toLocaleTimeString("vi-VN")
                          : "--:--"}
                      </td>
                      <td className="py-2.5 px-3 text-blue-700 font-semibold">
                        {log.checkOutTime
                          ? new Date(log.checkOutTime).toLocaleTimeString("vi-VN")
                          : "Đang trong Lab"}
                      </td>
                      <td className="py-2.5 px-3 text-blue-900 font-bold">
                        {log.durationText || "--"}
                      </td>
                      <td className="py-2.5 px-3 text-gray-700 font-sans">
                        {log.labName}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 text-[11px] font-sans">
                        {log.scanMethod === "WEBCAM" ? "Webcam AI" : "Súng quét USB"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            log.checkOutTime
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse"
                          }`}
                        >
                          {log.checkOutTime ? "Đã Check-out" : "Đang có mặt"}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPageView() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "LECTURER", "STUDENT"]}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
