"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import BarcodeLabel from "@/components/BarcodeLabel";
import {
  Users,
  UserPlus,
  ArrowLeft,
  Search,
  Printer,
  Shield,
  GraduationCap,
  Phone,
  Mail,
  CheckCircle2,
  X,
  Barcode as BarcodeIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";

function UsersManagementContent() {
  const { user, role: userRole } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBarcodeUser, setSelectedBarcodeUser] = useState<any>(null);

  // Form states
  const [studentCode, setStudentCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("STUDENT");
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
        body: JSON.stringify({ studentCode, fullName, email, phone, role }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setStudentCode("");
        setFullName("");
        setEmail("");
        setPhone("");
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

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.studentCode.includes(searchTerm) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
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
                <Users className="h-6 w-6 text-red-600" />
                DANH BẠ SINH VIÊN &amp; GIẢNG VIÊN PHÒNG LAB
              </h1>
              <p className="text-xs text-gray-500">
                Khoa Công nghệ Thông tin - Trường Đại học Văn Lang • Sinh viên sử dụng trực tiếp mã vạch trên thẻ SV để quẹt tại Laptop Trạm
              </p>
            </div>
          </div>

          {userRole === "ADMIN" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
            >
              <UserPlus className="h-4 w-4" />
              Thêm Sinh viên / Giảng viên Mới
            </button>
          )}
        </header>

        {/* SEARCH (CHỈ HIỂN THỊ KHI ADMIN QUẢN LÝ NHIỀU NGƯỜI) */}
        {userRole === "ADMIN" && (
          <div className="flex items-center gap-3 max-w-md">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tìm theo MSSV, Họ và tên hoặc Email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 shadow-sm"
              />
            </div>
          </div>
        )}

        {/* USERS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(userRole === "STUDENT" && user
            ? users.filter((u) => u.studentCode === user.studentCode)
            : filteredUsers
          ).map((u) => (
            <div
              key={u.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3.5 shadow-sm hover:shadow-md hover:border-gray-300 transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                        u.role === "ADMIN"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : u.role === "LECTURER"
                          ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {u.role === "ADMIN" ? (
                      <>
                        <Shield className="h-3 w-3" /> Quản trị viên
                      </>
                    ) : u.role === "LECTURER" ? (
                      <>
                        <Shield className="h-3 w-3" /> Giảng viên
                      </>
                    ) : (
                      <>
                        <GraduationCap className="h-3 w-3" /> Sinh viên trực Lab
                      </>
                    )}
                  </span>

                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                    Hoạt động
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900">{u.fullName}</h3>
                  <div className="text-xs text-red-600 font-mono font-bold mt-0.5">
                    Mã thẻ / MSSV: {u.studentCode}
                  </div>
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

              {/* THÔNG TIN MÃ THẺ ĐIỂM DANH */}
              {u.role === "STUDENT" && (
                <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Mã vạch trên thẻ:</span>
                  <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                    {u.studentCode}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL THÊM NGƯỜI DÙNG THẬT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">THÊM HỒ SƠ SINH VIÊN / GIẢNG VIÊN</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3.5 text-xs">
              <div>
                <label className="text-gray-700 font-medium block mb-1">Mã số sinh viên (MSSV) hoặc Mã GV:</label>
                <input
                  type="text"
                  required
                  placeholder="VD: 2373401010100 (In trên thẻ SV)"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-mono focus:outline-none focus:border-red-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-gray-700 font-medium block mb-1">Họ và tên đầy đủ:</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Thiện Đức"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-red-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-gray-700 font-medium block mb-1">Email trường Văn Lang:</label>
                <input
                  type="email"
                  required
                  placeholder="VD: duc.2373401010100@vanlanguni.vn"
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
                    placeholder="VD: 0912345678"
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
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-red-500 focus:bg-white"
                  >
                    <option value="STUDENT">Sinh viên trực Lab</option>
                    <option value="LECTURER">Giảng viên</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-gray-600">Mật khẩu ban đầu: 123456. Người dùng nên đổi mật khẩu sau khi đăng nhập.</p>

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

      {/* MODAL IN TEM BARCODE THẺ SV */}
      {selectedBarcodeUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col items-center">
            <h3 className="text-sm font-bold text-gray-900 mb-1">TEM BARCODE THẺ SINH VIÊN VLU</h3>
            <p className="text-xs text-gray-500 mb-4">Chuẩn mã vạch Code 128 dùng quét điểm danh</p>

            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm my-2">
              <BarcodeLabel
                value={selectedBarcodeUser.studentCode}
                title={selectedBarcodeUser.fullName}
                subtitle="TRƯỜNG ĐẠI HỌC VĂN LANG"
                footerText="THẺ SINH VIÊN TRỰC PHÒNG LAB"
              />
            </div>

            <div className="flex gap-3 mt-5 w-full">
              <button
                onClick={() => setSelectedBarcodeUser(null)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
              >
                Đóng
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="h-4 w-4" />
                In tem thẻ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersManagementPageView() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "STUDENT"]}>
      <UsersManagementContent />
    </ProtectedRoute>
  );
}
