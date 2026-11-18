"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Building2, Clock, KeyRound, Lock, Phone, RefreshCw, UserRound } from "lucide-react";

export default function RegisterPageView() {
  const [fullName, setFullName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredData, setRegisteredData] = useState<{ fullName: string; username: string; email: string; phone?: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận chưa khớp.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, studentCode, email, phone, password, role: "LECTURER" }),
      });
      const result = await response.json();
      if (!result.success) {
        setErrorMessage(result.message || "Không thể tạo tài khoản. Vui lòng thử lại.");
        return;
      }

      setRegisteredData({
        fullName,
        username: studentCode,
        email,
        phone,
      });
    } catch {
      setErrorMessage("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-gray-50 px-4 py-8 font-sans text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-red-700 transition"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Quay lại đăng nhập
          </Link>
        </div>

        {registeredData ? (
          <div className="space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600">
              <Clock className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-gray-900">Yêu cầu đăng ký đã được gửi!</h1>
              <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
                Tài khoản của bạn đã được ghi nhận vào hệ thống và đang chờ <strong>Quản trị viên (Admin)</strong> phê duyệt.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Họ và tên:</span>
                <span className="font-semibold text-gray-900">{registeredData.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tên đăng nhập / Mã:</span>
                <span className="font-mono font-semibold text-gray-900">{registeredData.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="text-gray-900">{registeredData.email}</span>
              </div>
              {registeredData.phone && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Số điện thoại:</span>
                  <span className="text-gray-900">{registeredData.phone}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2 items-center">
                <span className="text-gray-500">Trạng thái:</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[11px]">
                  <Clock className="h-3 w-3" />
                  Chờ xét duyệt
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Link
                href="/login"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-red-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-800 transition shadow-sm"
              >
                Quay lại trang đăng nhập
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        ) : (
          <>
            <header className="mb-6 space-y-2.5 text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-900">
                <Building2 aria-hidden="true" className="h-4 w-4" />
                KHOA CÔNG NGHỆ THÔNG TIN • ĐH VĂN LANG
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Đăng ký tài khoản</h1>
              <p className="text-xs leading-relaxed text-gray-600">
                Dành cho Giảng viên & Quản lý ca trực (Cần Admin phê duyệt).
              </p>
            </header>

            {errorMessage && (
              <div id="register-error" role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-medium text-rose-900">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="register-name" className="mb-1 block font-semibold text-gray-700">Họ và tên</label>
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="vd: ThS. Nguyễn Văn A"
                  maxLength={120}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs text-gray-900 focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label htmlFor="register-code" className="mb-1 block font-semibold text-gray-700">Tên đăng nhập / Mã tài khoản</label>
                <div className="relative">
                  <UserRound aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="register-code"
                    type="text"
                    autoComplete="username"
                    required
                    minLength={4}
                    maxLength={32}
                    value={studentCode}
                    onChange={(event) => setStudentCode(event.target.value)}
                    placeholder="vd: gv01 hoặc canbo01"
                    className="min-h-10 w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-xs text-gray-900 font-mono focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="register-email" className="mb-1 block font-semibold text-gray-700">Email</label>
                  <input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={190}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="vd: name@vanlanguni.vn"
                    className="min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs text-gray-900 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label htmlFor="register-phone" className="mb-1 block font-semibold text-gray-700">Số điện thoại</label>
                  <div className="relative">
                    <Phone aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      id="register-phone"
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="vd: 0981234567"
                      className="min-h-10 w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-xs text-gray-900 focus:outline-none focus:border-red-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="register-password" className="mb-1 block font-semibold text-gray-700">Mật khẩu</label>
                <div className="relative">
                  <Lock aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    maxLength={128}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="min-h-10 w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-xs text-gray-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-confirm-password" className="mb-1 block font-semibold text-gray-700">Xác nhận mật khẩu</label>
                <div className="relative">
                  <Lock aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="register-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    maxLength={128}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="min-h-10 w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-xs text-gray-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-800 disabled:opacity-60 shadow-sm"
                >
                  {isSubmitting ? <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" /> : <KeyRound aria-hidden="true" className="h-4 w-4" />}
                  {isSubmitting ? "Đang gửi yêu cầu…" : "Gửi yêu cầu đăng ký"}
                </button>
              </div>
            </form>

            <div className="mt-5 border-t border-gray-100 pt-4 text-center text-xs text-gray-600">
              Đã có tài khoản?{" "}
              <Link href="/login" className="font-semibold text-red-700 hover:underline">
                Đăng nhập
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
