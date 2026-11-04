"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Building2, Eye, EyeOff, KeyRound, Lock, RefreshCw, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPath = searchParams.get("redirect") || "/";
  const redirectPath = requestedPath.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/";
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const result = await login(identifier, password);
      if (!result.success) {
        setErrorMessage(result.message || "Không thể đăng nhập. Vui lòng kiểm tra thông tin và thử lại.");
        return;
      }
      router.push(redirectPath);
    } catch {
      setErrorMessage("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center bg-gray-50 px-4 py-8 font-sans text-slate-900">
        <Link
          href="/"
          className="absolute left-4 top-4 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1 sm:left-6 sm:top-6"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Trang chủ
        </Link>

        <section className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <header className="mb-6 space-y-3 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-900">
              <Building2 aria-hidden="true" className="h-4 w-4" />
              KHOA CÔNG NGHỆ THÔNG TIN • ĐH VĂN LANG
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Đăng nhập Quản lý</h1>
            <p className="text-sm leading-relaxed text-gray-700">
              Dành riêng cho Giảng viên &amp; Quản trị viên Khoa Công nghệ Thông tin.
            </p>
          </header>

          {errorMessage && (
            <div id="login-error" role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-900">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={errorMessage ? "login-error" : undefined}>
            <div>
              <label htmlFor="login-identifier" className="mb-1.5 block text-sm font-medium text-gray-800">
                Tài khoản (Tên đăng nhập / Email)
              </label>
              <div className="relative">
                <UserRound aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  id="login-identifier"
                  type="text"
                  autoComplete="username"
                  required
                  maxLength={190}
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="vd: chau.lth@vlu.edu.vn, minhanh.gv hoặc admin"
                  className="min-h-11 w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-base text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-gray-800">Mật khẩu</label>
              <div className="relative">
                <Lock aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-h-11 w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-11 text-base text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
                >
                  {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-800 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
            >
              {isSubmitting ? <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" /> : <KeyRound aria-hidden="true" className="h-4 w-4" />}
              {isSubmitting ? "Đang đăng nhập…" : "Đăng nhập"}
            </button>
          </form>

          {/* ĐĂNG NHẬP NHANH TÀI KHOẢN GIẢNG VIÊN / ADMIN */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-2.5">
              Đăng nhập nhanh tài khoản mẫu (MK: 123456)
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIdentifier("chau.lth@vlu.edu.vn");
                  setPassword("123456");
                }}
                className="p-2 border border-rose-200 rounded-lg bg-rose-50/50 hover:bg-rose-50 text-rose-800 text-left transition"
              >
                <div className="font-bold truncate">ThS. Huyền Châu</div>
                <div className="text-[10px] text-rose-600">Admin Khoa</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIdentifier("minhanh.gv@vlu.edu.vn");
                  setPassword("123456");
                }}
                className="p-2 border border-blue-200 rounded-lg bg-blue-50/50 hover:bg-blue-50 text-blue-800 text-left transition"
              >
                <div className="font-bold truncate">ThS. Minh Anh</div>
                <div className="text-[10px] text-blue-600">Giảng viên Lab</div>
              </button>
            </div>
          </div>
          <footer className="mt-5 border-t border-gray-200 pt-4 text-center text-xs text-gray-600">
            Phòng Lab 5.18, Tòa A, Cơ sở chính • Trường Đại học Văn Lang
          </footer>
        </section>
    </main>
  );
}

export default function LoginPageView() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-gray-50 p-4 text-sm text-gray-700" role="status">Đang tải…</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
