"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth, UserRole } from "@/lib/auth-context";
import { ShieldAlert, ArrowLeft, RefreshCw, LogIn } from "lucide-react";
import Link from "next/link";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-200">
          <RefreshCw className="h-5 w-5 text-red-600 animate-spin" />
          <span className="text-sm font-semibold text-slate-700">Đang kiểm tra quyền truy cập...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Nếu người dùng không nằm trong danh sách quyền cho phép
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl border border-gray-200 p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto shadow-2xs">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wide">
              Mã lỗi 403 • Từ chối truy cập
            </span>
            <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
              Bạn Không Có Quyền Truy Cập
            </h1>
            <p className="text-xs text-[#475569] leading-relaxed">
              Trang này chỉ dành cho vai trò:{" "}
              <strong className="text-slate-900">{allowedRoles.join(" hoặc ")}</strong>.
              <br />
              Tài khoản hiện tại của bạn là{" "}
              <strong className="text-red-600">
                {user.fullName} ({user.role === "LECTURER" ? "Giảng viên" : "Quản trị viên"})
              </strong>.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/"
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay về Trang Chủ
            </Link>
            <Link
              href="/login"
              className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <LogIn className="h-4 w-4" />
              Đăng nhập bằng tài khoản khác
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
