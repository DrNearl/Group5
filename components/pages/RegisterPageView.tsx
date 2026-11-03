"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, KeyRound, Lock, RefreshCw, UserRound } from "lucide-react";
import { useAuth, UserRole } from "@/lib/auth-context";

type RegistrationRole = Extract<UserRole, "STUDENT" | "LECTURER">;

export default function RegisterPageView() {
  const router = useRouter();
  const { login } = useAuth();
  const [fullName, setFullName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<RegistrationRole>("STUDENT");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận chưa khớp.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, studentCode, email, password, role }),
      });
      const result = await response.json();
      if (!result.success) {
        setErrorMessage(result.message || "Không thể tạo tài khoản. Vui lòng thử lại.");
        return;
      }

      const loginResult = await login(studentCode, password);
      if (!loginResult.success) {
        setErrorMessage("Tài khoản đã được tạo. Đăng nhập bằng mã tài khoản và mật khẩu vừa đăng ký.");
        return;
      }
      router.push("/");
    } catch {
      setErrorMessage("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-gray-50 px-4 py-8 font-sans text-slate-900">
      <section className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="mb-6 space-y-3 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-900">
            <Building2 aria-hidden="true" className="h-4 w-4" />
            KHOA CÔNG NGHỆ THÔNG TIN • ĐH VĂN LANG
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Đăng ký tài khoản</h1>
          <p className="text-sm leading-relaxed text-gray-700">Tạo tài khoản sử dụng hệ thống phòng Lab.</p>
        </header>

        {errorMessage && (
          <div id="register-error" role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-900">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={errorMessage ? "register-error" : undefined}>
          <div>
            <label htmlFor="register-name" className="mb-1.5 block text-sm font-medium text-gray-800">Họ và tên</label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              required
              maxLength={120}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1"
            />
          </div>

          <div>
            <label htmlFor="register-role" className="mb-1.5 block text-sm font-medium text-gray-800">Vai trò</label>
            <select
              id="register-role"
              value={role}
              onChange={(event) => setRole(event.target.value as RegistrationRole)}
              className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1"
            >
              <option value="STUDENT">Sinh viên</option>
              <option value="LECTURER">Giảng viên</option>
            </select>
          </div>

          <div>
            <label htmlFor="register-code" className="mb-1.5 block text-sm font-medium text-gray-800">Mã số sinh viên / Giảng viên</label>
            <div className="relative">
              <UserRound aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                id="register-code"
                type="text"
                autoComplete="username"
                required
                minLength={4}
                maxLength={32}
                value={studentCode}
                onChange={(event) => setStudentCode(event.target.value)}
                placeholder={role === "STUDENT" ? "Nhập MSSV" : "Nhập mã giảng viên"}
                className="min-h-11 w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-base text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-email" className="mb-1.5 block text-sm font-medium text-gray-800">Email</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              required
              maxLength={190}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@vanlanguni.vn"
              className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="mb-1.5 block text-sm font-medium text-gray-800">Mật khẩu</label>
            <div className="relative">
              <Lock aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-h-11 w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-base text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="mb-1.5 block text-sm font-medium text-gray-800">Xác nhận mật khẩu</label>
            <div className="relative">
              <Lock aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                id="register-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="min-h-11 w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-base text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1"
              />
            </div>
            <p className="mt-1 text-xs text-gray-600">Mật khẩu cần có từ 8 đến 128 ký tự.</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-800 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
          >
            {isSubmitting ? <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" /> : <KeyRound aria-hidden="true" className="h-4 w-4" />}
            {isSubmitting ? "Đang đăng ký…" : "Đăng ký"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-700">
          Đã có tài khoản?{" "}
          <Link href="/login" className="min-h-11 rounded px-1 font-semibold text-red-800 underline decoration-red-300 underline-offset-2 hover:text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700">
            Đăng nhập
          </Link>
        </p>
        <footer className="mt-5 border-t border-gray-200 pt-4 text-center text-xs text-gray-600">
          Phòng Lab 5.18, Tòa A, Cơ sở chính • Trường Đại học Văn Lang
        </footer>
      </section>
    </main>
  );
}
