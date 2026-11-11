"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  ArrowLeft,
  Search,
  Shield,
  GraduationCap,
  Phone,
  Mail,
  CheckCircle2,
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

  const filteredUsers = users.filter(
    (u) =>
      u.username !== "admin" &&
      (u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            Thêm Tài Khoản
          </button>
        </header>

        {/* SEARCH */}
        <div className="flex items-center gap-3 max-w-md">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Tìm theo Tên đăng nhập, Họ và tên hoặc Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 shadow-sm"
            />
          </div>
        </div>

        {/* USERS GRID */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm space-y-3">
            <Shield className="h-10 w-10 text-gray-300 mx-auto" />
            <h3 className="text-sm font-bold text-gray-700">Chưa có tài khoản Giảng viên nào trong danh sách</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Bấm nút &ldquo;Thêm Tài Khoản&rdquo;
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

                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                      Hoạt động
                    </span>
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
                <div className="pt-3 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => handleDeleteUser(u.id, u.fullName)}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 font-medium hover:underline"
                    title="Xóa tài khoản"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa tài khoản
                  </button>
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
              <h3 className="text-base font-bold text-gray-900">THÊM TÀI KHOẢN </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3.5 text-xs">
              <div>
                <label className="text-gray-700 font-medium block mb-1">Tên đăng nhập / Mã GV / Mã Cán bộ :</label>
                <input
                  type="text"
                  required
                  placeholder="VD: gv.khoacntt hoặc canbo01"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-mono focus:outline-none focus:border-red-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-gray-700 font-medium block mb-1">Họ và tên đầy đủ :</label>
                <input
                  type="text"
                  required
                  placeholder="VD: ThS. Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-red-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-gray-700 font-medium block mb-1">Email trường Văn Lang :</label>
                <input
                  type="email"
                  required
                  placeholder="VD: nguyenvana@vanlanguni.vn"
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
                    placeholder="VD: 0981234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-red-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-gray-700 font-medium block mb-1">Vai trò (Role):</label>
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
                <label className="text-gray-700 font-medium block mb-1">Mật khẩu đăng nhập ban đầu:</label>
                <input
                  type="text"
                  placeholder="Mặc định: 123456"
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
                  {isSubmitting ? "Đang lưu..." : "Lưu vào hệ thống"}
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
