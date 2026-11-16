"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Filter, History, RefreshCw, Search } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAssetPath } from "@/lib/asset-path";
import { useLanguage } from "@/lib/language-context";

interface AuditLogItem {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  target: string;
  detail: string | null;
  createdAt: string;
}

const ACTION_META: Record<string, { label: string; group: string; badgeClass: string }> = {
  QR_REISSUE: {
    label: "Cấp lại QR",
    group: "QR",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  QR_SEND_EMAIL: {
    label: "Gửi Email QR",
    group: "QR",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  MANUAL_ATTENDANCE: {
    label: "Điểm danh thủ công",
    group: "ATTENDANCE",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
  FORCE_CHECKOUT: {
    label: "Kết thúc lượt hộ",
    group: "ATTENDANCE",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
  },
  STUDENT_CREATE: {
    label: "Thêm sinh viên",
    group: "STUDENT",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  STUDENT_UPDATE: {
    label: "Sửa sinh viên",
    group: "STUDENT",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
  STUDENT_DELETE: {
    label: "Xóa sinh viên",
    group: "STUDENT",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
  STUDENT_IMPORT: {
    label: "Nhập PDF/Excel",
    group: "STUDENT",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  USER_CREATE: {
    label: "Tạo tài khoản",
    group: "USER",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  USER_DELETE: {
    label: "Xóa tài khoản",
    group: "USER",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
  PASSWORD_CHANGE: {
    label: "Đổi mật khẩu",
    group: "USER",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
  },
};

function AuditLogsContent() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupFilter, setGroupFilter] = useState("ALL");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(getAssetPath("/api/audit-logs"));
      const json = await res.json();
      if (json.success && Array.isArray(json.logs)) {
        setLogs(json.logs);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return logs.filter((log) => {
      const meta = ACTION_META[log.action];
      if (groupFilter !== "ALL" && meta?.group !== groupFilter) return false;
      if (!term) return true;
      return (
        log.actorName.toLowerCase().includes(term) ||
        log.target.toLowerCase().includes(term) ||
        (log.detail || "").toLowerCase().includes(term) ||
        (meta?.label || log.action).toLowerCase().includes(term)
      );
    });
  }, [logs, searchTerm, groupFilter]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 shadow-xs transition"
              title="Về Giám Sát Phòng Lab"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <History className="h-6 w-6 text-rose-500" />
                {t.audit.title}
              </h1>
              <p className="text-xs text-gray-500">
                {t.audit.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={loadLogs}
            className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-rose-500" : "text-gray-500"}`} />
            <span>{t.audit.refreshBtn}</span>
          </button>
        </header>

        {/* BỘ LỌC */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={t.audit.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rose-400 transition"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="bg-transparent text-gray-700 text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">{t.audit.allActions}</option>
              <option value="QR">Thẻ QR</option>
              <option value="ATTENDANCE">Điểm danh thủ công</option>
              <option value="STUDENT">Sinh viên</option>
              <option value="USER">Tài khoản</option>
            </select>
          </div>
        </div>

        {/* BẢNG NHẬT KÝ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-semibold tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Người thực hiện</th>
                  <th className="py-3 px-4">Hành động</th>
                  <th className="py-3 px-4">Đối tượng</th>
                  <th className="py-3 px-4">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => {
                    const meta = ACTION_META[log.action] || {
                      label: log.action,
                      badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
                    };
                    return (
                      <tr key={log.id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3.5 px-4 font-mono text-gray-600 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-gray-900">{log.actorName}</span>{" "}
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono text-[10px]">
                            {log.actorRole}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-900">{log.target}</td>
                        <td className="py-3.5 px-4 text-gray-500">{log.detail || "—"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">
                      {loading ? "Đang tải nhật ký thao tác..." : "Chưa có nhật ký thao tác nào phù hợp"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuditLogsPageView() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <AuditLogsContent />
    </ProtectedRoute>
  );
}
