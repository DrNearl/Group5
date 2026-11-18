"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Phone,
  Mail,
  X,
  Trash2,
  Pencil,
  KeyRound,
} from "lucide-react";
import type { UserRole } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/lib/language-context";

type ManagedUser = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
};

function UsersManagementContent() {
  const { lang, t } = useLanguage();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [createError, setCreateError] = useState("");
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("LECTURER");
  const [editError, setEditError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ManagedUser | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [resettingUser, setResettingUser] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [passwordResetError, setPasswordResetError] = useState("");
  const [passwordResetComplete, setPasswordResetComplete] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

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
    setCreateError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-vlu-language": lang },
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
        await loadUsers();
      } else {
        setCreateError(data.message || t.users.createErrorFallback);
      }
    } catch {
      setCreateError(t.users.createErrorFallback);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditUser = (account: ManagedUser) => {
    setEditingUser(account);
    setEditFullName(account.fullName);
    setEditEmail(account.email);
    setEditPhone(account.phone || "");
    setEditRole(account.role);
    setEditError("");
  };

  const closeEditUser = () => {
    setEditingUser(null);
    setEditError("");
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSavingEdit(true);
    setEditError("");
    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(editingUser.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-vlu-language": lang },
        body: JSON.stringify({ fullName: editFullName, email: editEmail, phone: editPhone, role: editRole }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((currentUsers) => currentUsers.map((account) => account.id === data.user.id ? data.user : account));
        closeEditUser();
      } else {
        setEditError(data.message || t.users.editErrorFallback);
      }
    } catch {
      setEditError(t.users.editErrorFallback);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleUserStatus = async (account: ManagedUser) => {
    setActionError("");
    try {
      const res = await fetch(`/api/users/status?id=${encodeURIComponent(account.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-vlu-language": lang },
        body: JSON.stringify({ isActive: !account.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((currentUsers) => currentUsers.map((user) => user.id === data.user.id ? data.user : user));
      } else {
        setActionError(data.message || t.users.actionErrorFallback);
      }
    } catch {
      setActionError(t.users.actionErrorFallback);
    }
  };

  const openDeleteConfirmation = (account: ManagedUser) => {
    setPendingDelete(account);
    setDeleteError("");
  };

  const closeDeleteConfirmation = () => {
    setPendingDelete(null);
    setDeleteError("");
  };

  const confirmDeleteUser = async () => {
    if (!pendingDelete) return;

    setIsDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(pendingDelete.id)}`, {
        method: "DELETE",
        headers: { "x-vlu-language": lang },
      });
      const data = await res.json();
      if (data.success) {
        setUsers((currentUsers) => currentUsers.filter((account) => account.id !== pendingDelete.id));
        closeDeleteConfirmation();
      } else {
        setDeleteError(data.message || t.users.actionErrorFallback);
      }
    } catch {
      setDeleteError(t.users.actionErrorFallback);
    } finally {
      setIsDeleting(false);
    }
  };

  const openPasswordReset = (account: ManagedUser) => {
    setResettingUser(account);
    setNewPassword("");
    setTemporaryPassword("");
    setPasswordResetError("");
    setPasswordResetComplete(false);
  };

  const closePasswordReset = () => {
    setResettingUser(null);
    setNewPassword("");
    setTemporaryPassword("");
    setPasswordResetError("");
    setPasswordResetComplete(false);
  };

  const submitPasswordReset = async (generateTemporary: boolean) => {
    if (!resettingUser) return;

    setIsResettingPassword(true);
    setPasswordResetError("");
    try {
      const res = await fetch(`/api/users/password?id=${encodeURIComponent(resettingUser.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-vlu-language": lang },
        body: JSON.stringify(generateTemporary ? { generateTemporary: true } : { password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordResetComplete(true);
        setNewPassword("");
        setTemporaryPassword(typeof data.temporaryPassword === "string" ? data.temporaryPassword : "");
      } else {
        setPasswordResetError(data.message || t.users.passwordResetErrorFallback);
      }
    } catch {
      setPasswordResetError(t.users.passwordResetErrorFallback);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handlePasswordResetSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submitPasswordReset(false);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username !== "admin" &&
      (u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-6 w-6 text-red-600" />
                QUẢN LÝ TÀI KHOẢN
              </h1>
              <p className="text-xs text-gray-600">
                Khoa Công nghệ Thông tin - Trường Đại học Văn Lang • Quản lý danh sách tài khoản Giảng viên & Cán bộ hướng dẫn
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setCreateError("");
              setShowAddModal(true);
            }}
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
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-900 placeholder-gray-600 focus:outline-none focus:border-red-500 shadow-sm"
            />
          </div>
        </div>

        {actionError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {actionError}
          </div>
        )}

        {/* USERS GRID */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm space-y-3">
            <Shield className="h-10 w-10 text-gray-300 mx-auto" />
            <h3 className="text-sm font-bold text-gray-700">Chưa có tài khoản Giảng viên nào trong danh sách</h3>
            <p className="text-xs text-gray-600 max-w-sm mx-auto">
              Bấm nút &ldquo;Thêm Tài Khoản&rdquo;
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 sm:gap-5">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3.5 shadow-sm hover:shadow-md hover:border-gray-300 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className="min-w-0 max-w-full text-xs leading-4 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border bg-indigo-50 text-indigo-800 border-indigo-200"
                    >
                      <Shield className="h-3 w-3 shrink-0" />
                      {u.role === "ADMIN" ? t.users.roleAdmin : t.users.roleLecturer}
                    </span>

                    <span className={`shrink-0 whitespace-nowrap text-xs font-mono border px-2 py-1 rounded-full font-semibold ${u.isActive
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : "text-amber-700 bg-amber-50 border-amber-200"
                    }`}>
                      {u.isActive ? t.users.activeStatus : t.users.lockedStatus}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-gray-900 [overflow-wrap:anywhere]">{u.fullName}</h3>
                    <div className="text-xs text-gray-500 font-mono mt-0.5 [overflow-wrap:anywhere]">Tài khoản: {u.username}</div>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <div className="flex min-w-0 items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <span className="min-w-0 truncate" title={u.email}>{u.email}</span>
                    </div>
                    {u.phone && (
                      <div className="flex min-w-0 items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        <span className="[overflow-wrap:anywhere]">{u.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ACTION FOOTER */}
                <div className="pt-3 border-t border-gray-100 flex flex-wrap justify-start sm:justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openEditUser(u)}
                    className="min-h-11 whitespace-nowrap rounded-md px-2 text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                    title={t.users.editButton}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t.users.editButton}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleUserStatus(u)}
                    className={`min-h-11 whitespace-nowrap rounded-md px-2 text-xs flex items-center gap-1 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${u.isActive ? "text-amber-700 hover:text-amber-900" : "text-emerald-700 hover:text-emerald-900"}`}
                    title={u.isActive ? t.users.deactivateButton : t.users.reactivateButton}
                  >
                    {u.isActive ? t.users.deactivateButton : t.users.reactivateButton}
                  </button>
                  <button
                    type="button"
                    onClick={() => openPasswordReset(u)}
                    className="min-h-11 whitespace-nowrap rounded-md px-2 text-xs text-indigo-700 hover:text-indigo-900 flex items-center gap-1 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                    title={t.users.resetPasswordButton}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {t.users.resetPasswordButton}
                  </button>
                  <button
                    onClick={() => openDeleteConfirmation(u)}
                    className="min-h-11 whitespace-nowrap rounded-md px-2 text-xs text-red-600 hover:text-red-800 flex items-center gap-1 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
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
              {createError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                  {createError}
                </div>
              )}
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
                  <label className="text-gray-700 font-medium block mb-1">{t.users.roleFieldLabel}:</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-red-500 focus:bg-white font-semibold"
                  >
                    <option value="LECTURER">{t.users.roleLecturer}</option>
                    <option value="ADMIN">{t.users.roleAdmin}</option>
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

      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">{t.users.editTitle}</h3>
              <button type="button" onClick={closeEditUser} className="text-gray-400 hover:text-gray-700" aria-label={t.users.cancelButton}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-3.5 text-xs">
              {editError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                  {editError}
                </div>
              )}

              <div>
                <label className="text-gray-700 font-medium block mb-1">{t.users.usernameLabel}</label>
                <input
                  type="text"
                  value={editingUser.username}
                  readOnly
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-600 font-mono"
                />
              </div>

              <div>
                <label className="text-gray-700 font-medium block mb-1">{t.users.fullNameLabel}</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={editFullName}
                  onChange={(event) => setEditFullName(event.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-red-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-gray-700 font-medium block mb-1">{t.users.emailLabel}</label>
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-red-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-700 font-medium block mb-1">{t.users.phoneLabel}</label>
                  <input
                    type="tel"
                    maxLength={30}
                    value={editPhone}
                    onChange={(event) => setEditPhone(event.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-red-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-gray-700 font-medium block mb-1">{t.users.roleFieldLabel}</label>
                  <select
                    value={editRole}
                    onChange={(event) => setEditRole(event.target.value as UserRole)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-red-500 focus:bg-white font-semibold"
                  >
                    <option value="LECTURER">{t.users.roleLecturer}</option>
                    <option value="ADMIN">{t.users.roleAdmin}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeEditUser}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
                >
                  {t.users.cancelButton}
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs shadow-sm disabled:opacity-50"
                >
                  {isSavingEdit ? t.users.savingButton : t.users.saveButton}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-gray-900">{t.users.deleteConfirmTitle}</h3>
            <p className="mt-2 text-sm text-gray-600">
              {t.users.deleteConfirmMessage.replace("{name}", pendingDelete.fullName)}
            </p>
            {deleteError && (
              <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {deleteError}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-3 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={closeDeleteConfirmation}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium disabled:opacity-50"
              >
                {t.users.cancelButton}
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs shadow-sm disabled:opacity-50"
              >
                {t.users.deleteConfirmButton}
              </button>
            </div>
          </div>
        </div>
      )}

      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {t.users.resetPasswordTitle.replace("{username}", resettingUser.username)}
              </h3>
              <button
                type="button"
                onClick={closePasswordReset}
                disabled={isResettingPassword}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-50"
                aria-label={t.users.cancelButton}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {passwordResetComplete ? (
              <div role="status" className="space-y-4">
                {temporaryPassword ? (
                  <>
                    <p className="text-sm font-semibold text-gray-900">{t.users.temporaryPasswordTitle}</p>
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-center font-mono text-lg font-bold tracking-wide text-indigo-900 select-all break-all">
                      {temporaryPassword}
                    </div>
                    <p className="text-xs leading-relaxed text-gray-600">{t.users.temporaryPasswordNotice}</p>
                  </>
                ) : (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {t.users.passwordResetSuccess}
                  </p>
                )}
                <div className="flex justify-end border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={closePasswordReset}
                    className="min-h-11 rounded-lg bg-gray-100 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    {t.users.cancelButton}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordResetSubmit} className="space-y-4 text-xs">
                {passwordResetError && (
                  <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                    {passwordResetError}
                  </div>
                )}

                <div>
                  <label htmlFor="users-reset-password" className="mb-1 block font-medium text-gray-700">
                    {t.users.newPasswordLabel}
                  </label>
                  <input
                    id="users-reset-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    maxLength={128}
                    required
                    placeholder={t.users.newPasswordPlaceholder}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-red-500 focus:bg-white focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-600">{t.users.passwordMinHint}</p>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:flex-wrap sm:justify-end">
                  <button
                    type="button"
                    onClick={closePasswordReset}
                    disabled={isResettingPassword}
                    className="min-h-11 rounded-lg bg-gray-100 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                  >
                    {t.users.cancelButton}
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitPasswordReset(true)}
                    disabled={isResettingPassword}
                    className="min-h-11 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
                  >
                    {isResettingPassword ? t.users.resettingPassword : t.users.generateTemporaryPasswordButton}
                  </button>
                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="min-h-11 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
                  >
                    {isResettingPassword ? t.users.resettingPassword : t.users.saveNewPasswordButton}
                  </button>
                </div>
              </form>
            )}
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
