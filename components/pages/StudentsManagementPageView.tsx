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
  AlertTriangle,
  Sparkles,
  QrCode,
  FileSpreadsheet,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import { parseVluStudentInfo, extractCohort } from "@/lib/vlu-student-helper";
import { getAssetPath } from "@/lib/asset-path";
import { useLanguage } from "@/lib/language-context";
import StudentQrModal from "@/components/modals/StudentQrModal";
import StudentBulkImportModal from "@/components/modals/StudentBulkImportModal";

function StudentsManagementContent() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCohort, setSelectedCohort] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [qrStudent, setQrStudent] = useState<any | null>(null);
  const [sendQrOnAdd, setSendQrOnAdd] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form states
  const [studentCode, setStudentCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [className, setClassName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit states
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editStudentCode, setEditStudentCode] = useState("");
  const [editClassName, setEditClassName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const openEditModal = (sv: any) => {
    setEditingStudent(sv);
    setEditFullName(sv.fullName);
    setEditStudentCode(sv.studentCode);
    setEditClassName(sv.className || "");
    setEditEmail(sv.email || "");
    setEditPhone(sv.phone || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(getAssetPath("/api/students"), {
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
      const res = await fetch(getAssetPath("/api/students"));
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
      const res = await fetch(getAssetPath("/api/students"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?.id ? { "x-vlu-user-id": user.id } : {}),
          ...(user?.email ? { "x-vlu-user-email": user.email } : {}),
          ...(user?.username ? { "x-vlu-username": user.username } : {}),
        },
        body: JSON.stringify({
          studentCode,
          fullName,
          className,
          email,
          phone,
          sendQrEmail: sendQrOnAdd,
          ttlDays: 90,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message || `Đã thêm thành công sinh viên ${fullName}!`);
        setTimeout(() => setActionMessage(null), 5000);
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
    if (!confirm(`Bạn có chắc muốn xóa sinh viên "${name}" khỏi danh sách phòng Lab?`)) return;
    try {
      const res = await fetch(getAssetPath("/api/students"), {
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

  const COHORT_TABS = [
    { key: "ALL", label: "Tất cả" },
    { key: "K27", label: "Khóa K27" },
    { key: "K28", label: "Khóa K28" },
    { key: "K29", label: "Khóa K29" },
    { key: "K30", label: "Khóa K30" },
    { key: "K31", label: "Khóa K31" },
    { key: "K32", label: "Khóa K32" },
    { key: "OTHER", label: "Khách / Khác" },
  ];

  const getCohortBadgeStyle = (cohort: string) => {
    switch (cohort) {
      case "K27":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "K28":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "K29":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "K30":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "K31":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "K32":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const filteredStudents = students.filter((sv) => {
    const matchesSearch =
      sv.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sv.studentCode.includes(searchTerm) ||
      (sv.className && sv.className.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedCohort === "ALL") return true;
    const cohort = extractCohort(sv.className, sv.studentCode);
    return cohort === selectedCohort;
  });

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
                {t.students.title}
              </h1>
              <p className="text-xs text-gray-500">
                {t.students.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              {t.students.importBtn}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition"
            >
              <UserPlus className="h-4 w-4" />
              {t.students.addBtn}
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

        {/* BỘ LỌC TÌM KIẾM VÀ DANH SÁCH KHÓA */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={t.students.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rose-400 transition"
            />
          </div>

          {/* LIST DROPDOWN LỌC THEO KHÓA */}
          <div className="w-full sm:w-auto">
            <select
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              className="w-full sm:w-48 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 font-medium focus:outline-none focus:border-rose-400 transition cursor-pointer"
            >
              <option value="ALL">{t.students.allCohorts}</option>
              <option value="K27">Khóa K27</option>
              <option value="K28">Khóa K28</option>
              <option value="K29">Khóa K29</option>
              <option value="K30">Khóa K30</option>
              <option value="K31">Khóa K31</option>
              <option value="K32">Khóa K32</option>
              <option value="OTHER">Khách / Ngoài khoa</option>
            </select>
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
                  <th className="py-3 px-4">Khóa & Lớp</th>
                  <th className="py-3 px-4">Trạng thái QR</th>
                  <th className="py-3 px-4">Thông tin liên hệ</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((sv, idx) => {
                    const cohort = extractCohort(sv.className, sv.studentCode);
                    const isAutoGenerated =
                      sv.fullName.includes("Sinh viên ") ||
                      sv.fullName.includes("Khách vãng lai") ||
                      sv.fullName.includes(`(${sv.studentCode})`);
                    const hasPhone = Boolean(sv.phone && sv.phone.trim());

                    return (
                      <tr key={sv.id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3.5 px-4 text-gray-400 font-mono">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900">{sv.fullName}</span>
                            {isAutoGenerated && (
                              <button
                                onClick={() => openEditModal(sv)}
                                className="px-1.5 py-0.5 rounded text-[9px] bg-rose-50 text-rose-600 border border-rose-200 font-medium hover:bg-rose-100 cursor-pointer"
                                title="Bấm để cập nhật họ tên thật"
                              >
                                Mới quét • Sửa tên
                              </button>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono">{sv.studentCode}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-md font-semibold text-[11px] border ${getCohortBadgeStyle(
                              cohort
                            )}`}
                          >
                            {sv.className || "DTH-CNTT"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                              sv.qrSentAt
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {sv.qrSentAt ? "Đã gửi QR" : "Chưa gửi QR"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 space-y-1">
                          {sv.email && (
                            <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                              <Mail className="h-3 w-3 text-gray-400 shrink-0" />
                              <span className="truncate max-w-[190px]">{sv.email}</span>
                            </div>
                          )}
                          {hasPhone ? (
                            <div className="flex items-center gap-1.5 text-gray-600 font-mono text-[11px]">
                              <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                              <span>{sv.phone}</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => openEditModal(sv)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-medium transition cursor-pointer"
                              title="Bấm để bổ sung số điện thoại"
                            >
                              <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                              <span>Chưa có SĐT (Thêm)</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setQrStudent(sv)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition"
                            title="Xem / Gửi email / Cấp lại Thẻ QR cá nhân"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
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
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      Không tìm thấy sinh viên nào thuộc bộ lọc này
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
                Thêm Sinh Viên Phòng Lab
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-gray-700 font-semibold">Lớp chuyên ngành</label>
                      <span className="text-[10px] text-gray-400">Chọn hoặc nhập</span>
                    </div>
                    <input
                      type="text"
                      list="suggested-classes-add"
                      placeholder="vd: 24DTH01, 23DTH01..."
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-rose-400"
                    />
                    <datalist id="suggested-classes-add">
                      <option value="24DTH01">Khóa K30 - 24DTH01</option>
                      <option value="24DTH02">Khóa K30 - 24DTH02</option>
                      <option value="23DTH01">Khóa K29 - 23DTH01</option>
                      <option value="23DTH02">Khóa K29 - 23DTH02</option>
                      <option value="22DTH01">Khóa K28 - 22DTH01</option>
                      <option value="21DTH01">Khóa K27 - 21DTH01</option>
                      <option value="DTH-CNTT">Đại học Công nghệ Thông tin</option>
                      <option value="KHACH-VLANGLAI">Khách vãng lai / Khác</option>
                    </datalist>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {["24DTH01", "23DTH01", "22DTH01", "DTH-CNTT"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setClassName(c)}
                          className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-[10px] text-gray-600 border border-gray-200 transition cursor-pointer"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
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

                <label className="flex items-center gap-2 pt-1 text-gray-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendQrOnAdd}
                    onChange={(e) => setSendQrOnAdd(e.target.checked)}
                    className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span>Tự động tạo & gửi Thẻ QR cá nhân vào Email sinh viên</span>
                </label>

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
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-gray-700 font-semibold">Lớp chuyên ngành</label>
                      <span className="text-[10px] text-gray-400">Chọn hoặc nhập</span>
                    </div>
                    <input
                      type="text"
                      list="suggested-classes-edit"
                      placeholder="vd: 24DTH01, 23DTH01..."
                      value={editClassName}
                      onChange={(e) => setEditClassName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-rose-400"
                    />
                    <datalist id="suggested-classes-edit">
                      <option value="24DTH01">Khóa K30 - 24DTH01</option>
                      <option value="24DTH02">Khóa K30 - 24DTH02</option>
                      <option value="23DTH01">Khóa K29 - 23DTH01</option>
                      <option value="23DTH02">Khóa K29 - 23DTH02</option>
                      <option value="22DTH01">Khóa K28 - 22DTH01</option>
                      <option value="21DTH01">Khóa K27 - 21DTH01</option>
                      <option value="DTH-CNTT">Đại học Công nghệ Thông tin</option>
                      <option value="KHACH-VLANGLAI">Khách vãng lai / Khác</option>
                    </datalist>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {["24DTH01", "23DTH01", "22DTH01", "DTH-CNTT"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditClassName(c)}
                          className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-[10px] text-gray-600 border border-gray-200 transition cursor-pointer"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
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

        {qrStudent && (
          <StudentQrModal
            student={qrStudent}
            userId={user?.id}
            userEmail={user?.email}
            username={user?.username}
            onClose={() => setQrStudent(null)}
            onUpdated={loadStudents}
          />
        )}

        {showImportModal && (
          <StudentBulkImportModal
            userId={user?.id}
            userEmail={user?.email}
            username={user?.username}
            onClose={() => setShowImportModal(false)}
            onImported={loadStudents}
          />
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


