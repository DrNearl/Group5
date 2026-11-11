"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  ArrowLeft,
  Search,
  GraduationCap,
  Phone,
  Mail,
  CheckCircle2,
  X,
  Trash2,
  Pencil,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";

function StudentsManagementContent() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form states
  const [studentCode, setStudentCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [className, setClassName] = useState("K29CNTT16");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit states
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editStudentCode, setEditStudentCode] = useState("");
  const [editClassName, setEditClassName] = useState("K29CNTT16");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const openEditModal = (sv: any) => {
    setEditingStudent(sv);
    setEditFullName(sv.fullName);
    setEditStudentCode(sv.studentCode);
    setEditClassName(sv.className || "K29CNTT16");
    setEditEmail(sv.email || "");
    setEditPhone(sv.phone || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingStudent.id,
          studentCode: editStudentCode,
          fullName: editFullName,
          className: editClassName,
          email: editEmail,
          phone: editPhone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Đã cập nhật thông tin sinh viên ${editFullName}!`);
        setTimeout(() => setActionMessage(null), 4000);
        setEditingStudent(null);
        loadStudents();
      } else {
        alert(data.message || "Không thể cập nhật sinh viên");
      }
    } catch (e: any) {
      alert("Lỗi kết nối: " + e.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await fetch("/api/students");
      const json = await res.json();
      if (json.success) {
        setStudents(json.students || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentCode,
          fullName,
          className,
          email,
          phone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Đã thêm thành công sinh viên ${fullName}!`);
        setTimeout(() => setActionMessage(null), 4000);
        setShowAddModal(false);
        setStudentCode("");
        setFullName("");
        setEmail("");
        setPhone("");
        loadStudents();
      } else {
        alert(data.message || "Không thể thêm sinh viên");
      }
    } catch (e: any) {
      alert("Lỗi kết nối: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa sinh viên "${name}" khỏi danh sách Xưởng thực tập?`)) return;
    try {
      const res = await fetch("/api/students", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Đã xóa sinh viên ${name}!`);
        setTimeout(() => setActionMessage(null), 3000);
        loadStudents();
      }
    } catch (e) {
      alert("Lỗi khi xóa sinh viên");
    }
  };

  const filteredStudents = students.filter(
    (sv) =>
      sv.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sv.studentCode.includes(searchTerm) ||
      (sv.className && sv.className.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 shadow-xs transition"
              title="Về Trạm Quét Barcode"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-6 w-6 text-rose-500" />
                DANH SÁCH SINH VIÊN XƯỞNG THỰC TẬP
              </h1>
              <p className="text-xs text-gray-500">
                Khoa Công nghệ Thông tin • Quản lý hồ sơ mã vạch &amp; Tổng hợp ca trực
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition"
            >
              <UserPlus className="h-4 w-4" />
              Thêm sinh viên mới
            </button>
          </div>
        </header>

        {/* THÔNG BÁO HÀNH ĐỘNG */}
        {actionMessage && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-900 flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* BỘ LỌC TÌM KIẾM */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo MSSV, Họ và tên hoặc Lớp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rose-400 transition"
            />
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Tổng cộng: <strong className="text-rose-600">{filteredStudents.length}</strong> sinh viên
          </div>
        </div>

        {/* BẢNG DANH SÁCH SINH VIÊN */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-semibold tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">STT</th>
                  <th className="py-3 px-4">Sinh viên</th>
                  <th className="py-3 px-4">Lớp</th>
                  <th className="py-3 px-4">Mã vạch thẻ SV</th>
                  <th className="py-3 px-4">Liên hệ</th>
                  <th className="py-3 px-4 text-center">Số ca trực</th>
                  <th className="py-3 px-4 text-right">Tổng giờ tích lũy</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((sv, idx) => (
                    <tr key={sv.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3.5 px-4 text-gray-400 font-mono">{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{sv.fullName}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{sv.studentCode}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium text-[11px]">
                          {sv.className || "DTH-CNTT"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-rose-600">
                        {sv.studentCode}
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        {sv.email && (
                          <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span>{sv.email}</span>
                          </div>
                        )}
                        {sv.phone && (
                          <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{sv.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-gray-800">
                        {sv.totalShifts}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600 text-sm">
                        {sv.totalHours} <span className="text-[11px] font-normal text-gray-400">hrs</span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => openEditModal(sv)}
                          className="p-1.5 bg-gray-50 hover:bg-rose-50 text-gray-600 hover:text-rose-600 rounded-lg border border-gray-200 transition"
                          title="Chỉnh sửa thông tin sinh viên"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(sv.id, sv.fullName)}
                          className="p-1.5 bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg border border-gray-200 transition"
                          title="Xóa sinh viên"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      Không tìm thấy sinh viên nào phù hợp
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL THÊM SINH VIÊN MỚI */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 relative animate-in fade-in zoom-in-95">
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-rose-500" />
                Thêm Sinh Viên Xưởng Thực Tập
              </h3>

              <form onSubmit={handleAddStudent} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Mã số sinh viên (MSSV) *</label>
                  <input
                    type="text"
                    required
                    placeholder="vd: 2373401010100"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-mono focus:outline-none focus:border-rose-400"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    (Chuỗi mã vạch in sẵn trên thẻ sinh viên VLU)
                  </span>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Họ và tên sinh viên *</label>
                  <input
                    type="text"
                    required
                    placeholder="vd: Nguyễn Thiện Đức"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Lớp chuyên ngành</label>
                    <input
                      type="text"
                      placeholder="vd: K29CNTT16"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Số điện thoại</label>
                    <input
                      type="tel"
                      placeholder="vd: 0912345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-rose-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Email Văn Lang</label>
                  <input
                    type="email"
                    placeholder="vd: duc.2373401010100@vanlanguni.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? "Đang lưu..." : "Lưu sinh viên"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CHỈNH SỬA SINH VIÊN */}
        {editingStudent && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 relative animate-in fade-in zoom-in-95">
              <button
                onClick={() => setEditingStudent(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Pencil className="h-5 w-5 text-rose-500" />
                Chỉnh Sửa Hồ Sơ Sinh Viên
              </h3>

              <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Mã số sinh viên (MSSV) *</label>
                  <input
                    type="text"
                    required
                    placeholder="vd: 2373401010100"
                    value={editStudentCode}
                    onChange={(e) => setEditStudentCode(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-mono focus:outline-none focus:border-rose-400"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    (Mã vạch thẻ sinh viên dùng quét điểm danh)
                  </span>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Họ và tên sinh viên *</label>
                  <input
                    type="text"
                    required
                    placeholder="vd: Nguyễn Thiện Đức"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Lớp chuyên ngành</label>
                    <input
                      type="text"
                      placeholder="vd: K29CNTT16"
                      value={editClassName}
                      onChange={(e) => setEditClassName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Số điện thoại</label>
                    <input
                      type="tel"
                      placeholder="vd: 0912345678"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-rose-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Email Văn Lang</label>
                  <input
                    type="email"
                    placeholder="vd: duc.2373401010100@vanlanguni.vn"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50"
                  >
                    {isSavingEdit ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentsManagementPageView() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "LECTURER"]}>
      <StudentsManagementContent />
    </ProtectedRoute>
  );
}


