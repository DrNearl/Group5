"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  GraduationCap,
  Phone,
  Mail,
  CheckCircle2,
  CheckCircle,
  Clock,
  Lock,
  Unlock,
  X,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";

function UsersManagementContent() {
  const { user, role: userRole } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [studentCode, setStudentCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("LECTURER");
  const [password, setPassword] = useState("123456");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success) {
        setUsers(json.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentCode, fullName, email, phone, role, password }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setStudentCode("");
        setFullName("");
        setEmail("");
        setPhone("");
        setPassword("123456");
        loadUsers();
      } else {
        alert("Lỗi: " + data.message);
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${name}" khỏi hệ thống?`)) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        loadUsers();
      } else {
        alert("Lỗi: " + data.message);
      }
    } catch (err: any) {
      alert("Lỗi khi xóa: " + err.message);
    }
  };

  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "ACTIVE">("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleToggleActive = async (id: string, nextActive: boolean, name: string) => {
    const actionLabel = nextActive ? "duyệt và kích hoạt" : "tạm khóa";
    if (!confirm(`Bạn có chắc chắn muốn ${actionLabel} tài khoản "${name}"?`)) return;
    setActionLoadingId(id);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: nextActive }),
      });
      const data = await res.json();
      if (data.success) {
        loadUsers();
      } else {
        alert("Lỗi: " + data.message);
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingUsersCount = users.filter((u) => u.username !== "admin" && !u.isActive).length;
  const activeUsersCount = users.filter((u) => u.username !== "admin" && u.isActive).length;
  const nonAdminUsers = users.filter((u) => u.username !== "admin");

  const filteredUsers = nonAdminUsers.filter((u) => {
    if (statusFilter === "PENDING" && u.isActive) return false;
    if (statusFilter === "ACTIVE" && !u.isActive) return false;
    return (
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-6 w-6 text-red-600" />
                QUẢN LÝ TÀI KHOẢN
              </h1>
              <p className="text-xs text-gray-500">
                Khoa Công nghệ Thông tin - Trường Đại học Văn Lang • Quản lý danh sách tài khoản Giảng viên & Cán bộ hướng dẫn
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
          >
            <UserPlus className="h-4 w-4" />
            Thêm tài khoản
          </button>
        </header>

        {/* FILTERS & SEARCH */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md min-w-[260px]">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Tìm theo tên đăng nhập, họ và tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === "ALL"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tất cả ({nonAdminUsers.length})
            </button>
            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                statusFilter === "PENDING"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Chờ duyệt
              {pendingUsersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {pendingUsersCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === "ACTIVE"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Hoạt động ({activeUsersCount})
            </button>
          </div>
        </div>

        {/* USERS GRID */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm space-y-3">
            <Shield className="h-10 w-10 text-gray-300 mx-auto" />
            <h3 className="text-sm font-bold text-gray-700">Chưa có tài khoản nào trong danh sách</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Bấm nút &ldquo;Thêm tài khoản&rdquo;
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3.5 shadow-sm hover:shadow-md hover:border-gray-300 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border bg-indigo-50 text-indigo-800 border-indigo-200"
                    >
                      <Shield className="h-3 w-3" />
                      Giảng viên / Quản lý ca trực
                    </span>

                    {u.isActive ? (
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Hoạt động
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-600" />
                        Chờ duyệt
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-gray-900">{u.fullName}</h3>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">Tài khoản: {u.username}</div>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <span className="truncate">{u.email}</span>
                    </div>
                    {u.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        <span>{u.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ACTION FOOTER */}
                <div className="pt-3 border-t border-gray-100">
                  {!u.isActive ? (
                    <div className="flex items-center justify-between w-full gap-2">
                      <button
                        onClick={() => handleToggleActive(u.id, true, u.fullName)}
                        disabled={actionLoadingId === u.id}
                        className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition disabled:opacity-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        {actionLoadingId === u.id ? "Đang xử lý..." : "Duyệt tài khoản"}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.fullName)}
                        disabled={actionLoadingId === u.id}
                        className="py-1.5 px-2.5 bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                        title="Từ chối yêu cầu"
                      >
                        <X className="h-3.5 w-3.5" />
                        Từ chối
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <button
                        onClick={() => handleToggleActive(u.id, false, u.fullName)}
                        disabled={actionLoadingId === u.id}
                        className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1 font-medium hover:underline disabled:opacity-50"
                        title="Tạm khóa tài khoản"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Khóa
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.fullName)}
                        disabled={actionLoadingId === u.id}
                        className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 font-medium hover:underline disabled:opacity-50"
                        title="Xóa tài khoản"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL THÊM NGƯỜI DÙNG THẬT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">Thêm tài khoản</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3.5 text-xs">
              <div>
                <label className="text-gray-700 font-medium block mb-1">Tên đăng nhập / Mã tài khoản:</label>
                <input
                  type="text"
                  required
                  placeholder="vd: gv01 hoặc canbo01"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-mono focus:outline-none focus:border-red-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-gray-700 font-medium block mb-1">Họ và tên:</label>
                <input
                  type="text"
                  required
                  placeholder="vd: Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-red-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-gray-700 font-medium block mb-1">Email:</label>
                <input
                  type="email"
                  required
                  placeholder="vd: nguyenvana@vanlanguni.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-red-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-700 font-medium block mb-1">Số điện thoại:</label>
                  <input
                    type="text"
                    placeholder="vd: 0981234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-red-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-gray-700 font-medium block mb-1">Vai trò:</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-red-500 focus:bg-white font-semibold"
                  >
                    <option value="LECTURER">Giảng viên / Quản lý ca trực</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-700 font-medium block mb-1">Mật khẩu ban đầu:</label>
                <input
                  type="text"
                  placeholder="123456"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-mono focus:outline-none focus:border-red-500 focus:bg-white"
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
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs shadow-sm"
                >
                  {isSubmitting ? "Đang lưu..." : "Lưu tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersManagementPageView() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <UsersManagementContent />
    </ProtectedRoute>
  );
}
