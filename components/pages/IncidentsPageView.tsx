"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Laptop,
  Search,
  Filter,
  Wrench,
  User,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";

function IncidentsContent() {
  const { user, role } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/incidents");
      const json = await res.json();
      if (json.success) {
        setIncidents(json.incidents || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/incidents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, incidentStatus: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        loadIncidents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteIncident = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phiếu báo hỏng này?")) return;
    try {
      const res = await fetch(`/api/incidents?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        loadIncidents();
      } else {
        alert("Lỗi: " + data.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.equipment.equipmentBarcode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === "ALL" || inc.incidentStatus === statusFilter;
    return matchesSearch && matchesFilter;
  });

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
                <AlertTriangle className="h-6 w-6 text-rose-600" />
                QUẢN LÝ SỰ CỐ & BẢO TRÌ THIẾT BỊ PHÒNG LAB
              </h1>
              <p className="text-xs text-gray-500">
                Phiếu sự cố được ghi nhận tự động bằng Smart Barcode Router tại Trạm Quét Kiosk
              </p>
            </div>
          </div>
        </header>

        {/* 4 THẺ THỐNG KÊ SỰ CỐ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            onClick={() => setStatusFilter("ALL")}
            className={`p-4 rounded-xl border transition cursor-pointer shadow-sm ${
              statusFilter === "ALL"
                ? "bg-white border-gray-400 ring-2 ring-gray-300"
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="text-xs font-semibold text-gray-500 uppercase">Tổng phiếu sự cố</div>
            <div className="text-2xl font-bold text-gray-900 font-mono mt-1">{incidents.length}</div>
          </div>

          <div
            onClick={() => setStatusFilter("OPEN")}
            className={`p-4 rounded-xl border transition cursor-pointer shadow-sm ${
              statusFilter === "OPEN"
                ? "bg-rose-50 border-rose-400 ring-2 ring-rose-200"
                : "bg-white border-gray-200 hover:border-rose-300"
            }`}
          >
            <div className="text-xs font-semibold text-rose-700 uppercase">Chờ xử lý (OPEN)</div>
            <div className="text-2xl font-bold text-rose-600 font-mono mt-1">
              {incidents.filter((i) => i.incidentStatus === "OPEN").length}
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("IN_PROGRESS")}
            className={`p-4 rounded-xl border transition cursor-pointer shadow-sm ${
              statusFilter === "IN_PROGRESS"
                ? "bg-amber-50 border-amber-400 ring-2 ring-amber-200"
                : "bg-white border-gray-200 hover:border-amber-300"
            }`}
          >
            <div className="text-xs font-semibold text-amber-700 uppercase">Đang sửa chữa</div>
            <div className="text-2xl font-bold text-amber-600 font-mono mt-1">
              {incidents.filter((i) => i.incidentStatus === "IN_PROGRESS").length}
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("RESOLVED")}
            className={`p-4 rounded-xl border transition cursor-pointer shadow-sm ${
              statusFilter === "RESOLVED"
                ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200"
                : "bg-white border-gray-200 hover:border-emerald-300"
            }`}
          >
            <div className="text-xs font-semibold text-emerald-700 uppercase">Đã khắc phục</div>
            <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">
              {incidents.filter((i) => i.incidentStatus === "RESOLVED").length}
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm theo tiêu đề lỗi hoặc mã vạch máy..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300 text-xs shadow-sm">
              <Filter className="h-3.5 w-3.5 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-gray-800 font-medium focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="OPEN">Chờ xử lý (OPEN)</option>
                <option value="IN_PROGRESS">Đang sửa chữa</option>
                <option value="RESOLVED">Đã khắc phục</option>
              </select>
            </div>
          </div>
        </div>

        {/* DANH SÁCH SỰ CỐ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredIncidents.map((inc) => (
            <div
              key={inc.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3.5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      inc.severity === "CRITICAL"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : inc.severity === "HIGH"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    Mức độ: {inc.severity}
                  </span>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inc.incidentStatus === "OPEN"
                        ? "bg-rose-100 text-rose-800"
                        : inc.incidentStatus === "IN_PROGRESS"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {inc.incidentStatus === "OPEN"
                      ? "Chờ tiếp nhận"
                      : inc.incidentStatus === "IN_PROGRESS"
                      ? "Đang sửa"
                      : "Đã khắc phục"}
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 text-base leading-snug">{inc.title}</h3>

                {inc.description && (
                  <p className="text-xs text-gray-600 line-clamp-2">{inc.description}</p>
                )}

                <div className="pt-2 text-xs space-y-1.5 text-gray-500 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 font-mono text-gray-700">
                    <Laptop className="h-3.5 w-3.5 text-gray-400" />
                    <span>
                      {inc.equipment.equipmentName} ({inc.equipment.equipmentBarcode})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                    <span>Báo bởi: {inc.reportedBy?.fullName || "Sinh viên trực Lab"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span>{new Date(inc.createdAt).toLocaleString("vi-VN")}</span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS (CHỈ QUẢN TRỊ VIÊN) */}
              {role === "ADMIN" || role === "LECTURER" ? (
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    {inc.incidentStatus !== "RESOLVED" && (
                      <button
                        onClick={() => handleUpdateStatus(inc.id, "RESOLVED")}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-semibold flex items-center gap-1 transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Đã sửa xong
                      </button>
                    )}
                    {inc.incidentStatus === "OPEN" && (
                      <button
                        onClick={() => handleUpdateStatus(inc.id, "IN_PROGRESS")}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-semibold flex items-center gap-1 transition"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        Đang xử lý
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteIncident(inc.id)}
                    className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg transition"
                    title="Xóa phiếu sự cố (Chỉ Admin)"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="pt-2.5 border-t border-gray-100 text-[11px] text-gray-500 font-medium">
                  Phiếu đã được tiếp nhận và phân công đội ngũ bảo trì xử lý.
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredIncidents.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-400">
            Không có phiếu sự cố nào phù hợp với bộ lọc hiện tại.
          </div>
        )}
      </div>
    </div>
  );
}

export default function IncidentsPageView() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "LECTURER", "STUDENT"]}>
      <IncidentsContent />
    </ProtectedRoute>
  );
}
