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
  GraduationCap,
  Phone,
  Mail,
  CheckCircle2,
  X,
  Barcode as BarcodeIcon,
  Trash2,
  Pencil,
  RotateCcw,
  Archive,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";

function StudentsManagementContent() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [selectedBarcodeStudent, setSelectedBarcodeStudent] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<(() => Promise<void>) | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "VERIFIED">("ALL");
  const [activityFilter, setActivityFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ALL");
  const [rejectedScans, setRejectedScans] = useState<any[]>([]);
  const [summary, setSummary] = useState({ activeCount: 0, inactiveCount: 0, pendingCount: 0 });

  // Form states
  const [studentCode, setStudentCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [className, setClassName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showActionToast = (message: string, undo?: () => Promise<void>) => {
    setActionMessage(message);
    setUndoAction(undo ? () => undo : null);
    setTimeout(() => { setActionMessage(null); setUndoAction(null); }, 6000);
  };

  const loadStudents = async () => {
    try {
      const res = await fetch(`/api/students?activity=${activityFilter}`);
      const json = await res.json();
      if (json.success) {
        setLoadError(null);
        setStudents(json.students || []);
        setRejectedScans(json.rejectedScans || []);
        setSummary(json.summary || { activeCount: 0, inactiveCount: 0, pendingCount: 0 });
      } else {
        setLoadError(json.message || "Không thể tải danh sách sinh viên.");
      }
    } catch (e) {
      console.error(e);
      setLoadError("Không thể kết nối để tải danh sách sinh viên.");
    }
  };

  useEffect(() => {
    loadStudents();
  }, [activityFilter]);

  const openCreateStudent = () => {
    setEditingStudent(null);
    setStudentCode("");
    setFullName("");
    setClassName("");
    setEmail("");
    setPhone("");
    setShowAddModal(true);
  };

  const openStudentEditor = (student: any) => {
    setEditingStudent(student);
    setStudentCode(student.studentCode);
    setFullName(student.fullName || "");
    setClassName(student.className || "");
    setEmail(student.email || "");
    setPhone(student.phone || "");
    setShowAddModal(true);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/students", {
        method: editingStudent ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentCode,
          fullName,
          className,
          email,
          phone,
          ...(editingStudent ? { id: editingStudent.id, updateProfile: true } : {}),
        }),
      });
      const data = await res.json();
      if (!data.success && data.code === "INACTIVE_STUDENT" && user?.role === "ADMIN") {
        const shouldRestore = confirm(`MSSV này đã có hồ sơ bị ngừng hoạt động. Khôi phục và cập nhật thông tin?`);
        if (shouldRestore) {
          const restoreRes = await fetch("/api/students", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.studentId, fullName, className, email, phone, verifyProfile: true, restore: true }),
          });
          const restoreData = await restoreRes.json();
          if (restoreData.success) {
            setActionMessage(restoreData.message);
            setShowAddModal(false);
            await loadStudents();
          } else alert(restoreData.message || "Không thể khôi phục hồ sơ");
        }
        return;
      }
      if (data.success) {
        showActionToast(data.message || `Đã lưu hồ sơ sinh viên ${fullName}!`);
        setShowAddModal(false);
        setEditingStudent(null);
        setStudentCode("");
        setFullName("");
        setClassName("");
        setEmail("");
        setPhone("");
        await loadStudents();
      } else {
        alert(data.message || "Không thể thêm sinh viên");
      }
    } catch (e: any) {
      alert("Lỗi kết nối: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (student: any, hardDelete = false) => {
    const name = student.fullName || student.studentCode;
    const prompt = hardDelete
      ? `Xóa vĩnh viễn hồ sơ có MSSV không hợp lệ "${name}"? Thao tác này không thể hoàn tác.`
      : `Ngừng hoạt động hồ sơ "${name}"? Ca đang mở sẽ được đóng, lịch sử điểm danh được giữ nguyên và admin có thể khôi phục.`;
    if (!confirm(prompt)) return;
    try {
      const res = await fetch("/api/students", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: student.id, hardDelete }),
      });
      const data = await res.json();
      if (data.success) {
        if (hardDelete) showActionToast(data.message || `Đã xóa vĩnh viễn ${name}.`);
        else showActionToast(data.message || `Đã ngừng hoạt động ${name}.`, async () => {
          await fetch("/api/students", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: student.id, restore: true }) });
          await loadStudents();
        });
        await loadStudents();
      } else {
        alert(data.message || "Không thể xóa sinh viên");
      }
    } catch (e: any) {
      alert("Lỗi khi xóa sinh viên: " + (e?.message || "Lỗi kết nối"));
    }
  };

  const restoreStudent = async (student: any) => {
    if (!confirm(`Khôi phục hồ sơ ${student.fullName || student.studentCode}?`)) return;
    const res = await fetch("/api/students", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: student.id, restore: true }) });
    const data = await res.json();
    if (data.success) {
      showActionToast(data.message || `Đã khôi phục ${student.fullName || student.studentCode}.`, async () => {
        await fetch("/api/students", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: student.id }) });
        await loadStudents();
      });
      await loadStudents();
    }
    else alert(data.message || "Không thể khôi phục hồ sơ");
  };

  const filteredStudents = students
    .filter((sv) => statusFilter === "ALL" || sv.profileStatus === statusFilter)
    .filter((sv) => activityFilter === "ALL" || (activityFilter === "ACTIVE" ? sv.isActive : !sv.isActive))
    .filter(
      (sv) =>
        (sv.fullName || "Chưa có tên").toLocaleLowerCase("vi-VN").includes(searchTerm.toLocaleLowerCase("vi-VN")) ||
        sv.studentCode.includes(searchTerm) ||
        (sv.className && sv.className.toLocaleLowerCase("vi-VN").includes(searchTerm.toLocaleLowerCase("vi-VN")))
    )
    .sort((a, b) => {
      const group = (student: any) => !student.isActive ? 2 : student.profileStatus === "PENDING" ? 0 : 1;
      const aGroup = group(a);
      const bGroup = group(b);
      if (aGroup !== bGroup) return aGroup - bGroup;
      if (aGroup === 1) return (a.fullName || "").localeCompare(b.fullName || "", "vi");
      if (aGroup === 2) return new Date(b.deactivatedAt || 0).getTime() - new Date(a.deactivatedAt || 0).getTime();
      return new Date(b.firstSeenAt || b.createdAt).getTime() - new Date(a.firstSeenAt || a.createdAt).getTime();
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
                DANH SÁCH SINH VIÊN TRỰC LAB
              </h1>
              <p className="text-xs text-gray-500">
                Khoa Công nghệ Thông tin • Quản lý hồ sơ mã vạch &amp; Tổng hợp ca trực
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={openCreateStudent}
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
            {undoAction && <button onClick={() => void undoAction()} className="ml-auto rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 font-semibold hover:bg-emerald-100" aria-label="Hoàn tác thao tác">Hoàn tác</button>}
          </div>
        )}
        {loadError && (
          <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs font-semibold text-rose-900">
            {loadError}
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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "PENDING" | "VERIFIED")}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-rose-400"
            aria-label="Lọc trạng thái hồ sơ sinh viên"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chưa xác minh</option>
            <option value="VERIFIED">Đã xác minh</option>
          </select>
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value as "ACTIVE" | "INACTIVE" | "ALL")}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-rose-400"
            aria-label="Lọc trạng thái hoạt động"
          >
            <option value="ACTIVE">Đang hoạt động ({summary.activeCount})</option>
            <option value="INACTIVE">Đã ngừng hoạt động ({summary.inactiveCount})</option>
            <option value="ALL">Tất cả hồ sơ</option>
          </select>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setStatusFilter("ALL"); setActivityFilter("ACTIVE"); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${activityFilter === "ACTIVE" && statusFilter === "ALL" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-gray-200 bg-white text-gray-600"}`}>Đang hoạt động ({summary.activeCount})</button>
            <button onClick={() => { setStatusFilter("PENDING"); setActivityFilter("ALL"); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${statusFilter === "PENDING" ? "border-amber-300 bg-amber-50 text-amber-800" : "border-gray-200 bg-white text-gray-600"}`}>Chưa xác minh ({summary.pendingCount})</button>
            <button onClick={() => { setStatusFilter("ALL"); setActivityFilter("INACTIVE"); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${activityFilter === "INACTIVE" ? "border-gray-400 bg-gray-100 text-gray-800" : "border-gray-200 bg-white text-gray-600"}`}>Đã ngừng hoạt động ({summary.inactiveCount})</button>
          </div>
        </div>

        {user?.role === "ADMIN" && rejectedScans.some((scan) => scan.restoreAvailable) && (
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
            <h2 className="text-xs font-bold text-amber-900">Lượt quét bị từ chối do hồ sơ đã ngừng hoạt động</h2>
            {rejectedScans.filter((scan) => scan.restoreAvailable).slice(0, 5).map((scan) => (
              <div key={scan.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
                <span>MSSV {scan.student?.studentCode} · {scan.student?.fullName || "Chưa cập nhật"} · {new Date(scan.scannedAt).toLocaleString("vi-VN")}</span>
                <button onClick={() => restoreStudent({ id: scan.student.id })} className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 font-semibold hover:bg-amber-100">
                  <RotateCcw className="h-3.5 w-3.5" /> Khôi phục hồ sơ
                </button>
              </div>
            ))}
          </section>
        )}

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
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((sv, idx) => (
                    <tr key={sv.id} className={`${sv.isActive ? "hover:bg-gray-50/80" : "bg-gray-50/80"} transition`}>
                      <td className={`py-3.5 px-4 font-mono ${sv.isActive ? "text-gray-400" : "text-gray-400 opacity-60"}`}>{sv.isActive ? filteredStudents.slice(0, idx + 1).filter((item) => item.isActive).length : "—"}</td>
                      <td className={`py-3.5 px-4 ${sv.isActive ? "" : "opacity-60"}`}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={sv.fullName ? "font-bold text-gray-900" : "italic font-normal text-gray-400"}>{sv.fullName || "Chưa cập nhật"}</span>
                        </div>
                        <div className={`text-[11px] font-mono ${sv.studentCodeInvalid ? "text-red-600 font-semibold" : "text-gray-500"}`}>{sv.studentCode}</div>
                      </td>
                      <td className={`py-3.5 px-4 ${sv.isActive ? "" : "opacity-60"}`}>
                        <span className={`inline-block min-w-[5rem] whitespace-nowrap px-2 py-0.5 rounded-md ${sv.className ? "bg-gray-100 text-gray-700 font-medium" : "italic text-gray-400"} text-[11px]`}>
                          {sv.className || "Chưa cập nhật"}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 font-mono ${sv.studentCodeInvalid ? "font-semibold text-red-600" : "text-gray-700"} ${sv.isActive ? "" : "opacity-60"}`}>
                        {sv.studentCode}
                      </td>
                      <td className={`py-3.5 px-4 space-y-0.5 ${sv.isActive ? "" : "opacity-60"}`}>
                        <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className={sv.email ? "" : "italic text-gray-400"}>{sv.email || "Chưa cập nhật"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className={sv.phone ? "" : "italic text-gray-400"}>{sv.phone || "Chưa cập nhật"}</span>
                        </div>
                      </td>
                      <td className={`py-3.5 px-4 text-center font-mono font-bold text-gray-800 ${sv.isActive ? "" : "opacity-60"}`}>
                        {sv.totalShifts}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-mono font-bold text-gray-700 text-sm ${sv.isActive ? "" : "opacity-60"}`}>
                        {sv.totalHours} <span className="text-[11px] font-normal text-gray-400">hrs</span>
                      </td>
                      <td className="py-3.5 px-4 space-y-1">
                        {sv.profileStatus === "PENDING" && <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Chưa xác minh</span>}
                        {!sv.isActive && <div><span className="inline-flex whitespace-nowrap rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">Đã ngừng hoạt động</span>{sv.deactivatedAt && <div className="mt-1 whitespace-nowrap text-[10px] text-gray-500">Ngừng từ {new Date(sv.deactivatedAt).toLocaleDateString("vi-VN")}</div>}</div>}
                        {sv.studentCodeInvalid && <span className="inline-flex whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">MSSV không hợp lệ</span>}
                        {sv.isActive && sv.profileStatus !== "PENDING" && !sv.studentCodeInvalid && <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex justify-end gap-1 whitespace-nowrap">
                          {sv.isActive ? <>
                            <button onClick={() => openStudentEditor(sv)} className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 hover:bg-amber-50 hover:text-amber-800" title="Cập nhật thông tin" aria-label={`Cập nhật ${sv.fullName || sv.studentCode}`}><Pencil className="h-3.5 w-3.5" />Cập nhật</button>
                            <details className="relative">
                              <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100" title="Thao tác khác" aria-label={`Thao tác khác cho ${sv.fullName || sv.studentCode}`}><MoreHorizontal className="h-4 w-4" /></summary>
                              <div className="absolute right-0 z-10 mt-1 min-w-44 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                                <button onClick={() => setSelectedBarcodeStudent(sv)} title="In mã vạch" aria-label={`In mã vạch ${sv.studentCode}`} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs hover:bg-gray-50"><BarcodeIcon className="h-4 w-4" />In mã vạch</button>
                                <button onClick={() => handleDeleteStudent(sv)} title="Ngừng hoạt động" aria-label={`Ngừng hoạt động ${sv.fullName || sv.studentCode}`} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"><Archive className="h-4 w-4" />Ngừng hoạt động</button>
                              </div>
                            </details>
                          </> : sv.studentCodeInvalid ? <>
                            {!sv.hasAttendanceLogs && <button onClick={() => handleDeleteStudent(sv, true)} title="Xóa vĩnh viễn hồ sơ lỗi" aria-label={`Xóa vĩnh viễn hồ sơ ${sv.studentCode}`} className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 bg-white px-2 text-xs text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Xóa vĩnh viễn</button>}
                          </> : user?.role === "ADMIN" ? <button onClick={() => restoreStudent(sv)} className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100" title="Khôi phục hồ sơ" aria-label={`Khôi phục ${sv.fullName || sv.studentCode}`}><RotateCcw className="h-3.5 w-3.5" />Khôi phục</button> : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
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
                onClick={() => { setShowAddModal(false); setEditingStudent(null); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-rose-500" />
                {editingStudent ? "Cập nhật thông tin sinh viên" : "Thêm Sinh Viên Trực Lab"}
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
                    disabled={Boolean(editingStudent)}
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
                      placeholder="vd: 23DTH01"
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
                    onClick={() => { setShowAddModal(false); setEditingStudent(null); }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? "Đang lưu..." : editingStudent ? "Cập nhật sinh viên" : "Lưu sinh viên"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL IN TEM MÃ VẠCH THẺ SV */}
        {selectedBarcodeStudent && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 relative text-center">
              <button
                onClick={() => setSelectedBarcodeStudent(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-sm font-bold text-gray-900 mb-1">MÃ VẠCH THẺ SINH VIÊN</h3>
              <p className="text-xs text-gray-500 mb-4">{selectedBarcodeStudent.fullName || "Chưa có tên"} - {selectedBarcodeStudent.studentCode}</p>

              <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-xs inline-block mb-4">
                <BarcodeLabel
                  value={selectedBarcodeStudent.studentCode}
                  title="THẺ SINH VIÊN VLU"
                  subtitle={selectedBarcodeStudent.fullName || "Chưa xác minh"}
                  width={2}
                  height={50}
                  fontSize={14}
                />
              </div>

              <div className="flex justify-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="h-4 w-4" />
                  In nhãn
                </button>
                <button
                  onClick={() => setSelectedBarcodeStudent(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium"
                >
                  Đóng
                </button>
              </div>
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


