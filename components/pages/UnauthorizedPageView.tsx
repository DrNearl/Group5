"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function UnauthorizedPageView() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-200 p-8 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto shadow-2xs">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wide">
            Lỗi 403 • Phân quyền truy cập
          </span>
          <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
            Khu Vực Bị Giới Hạn Quyền
          </h1>
          <p className="text-xs text-[#475569] leading-relaxed">
            Bạn không có thẩm quyền truy cập phân hệ này.
            {user && (
              <>
                <br />
                Đang đăng nhập với vai trò:{" "}
                <span className="font-bold text-red-600">
                  {user.role === "STUDENT" ? "Sinh viên" : user.role === "LECTURER" ? "Giảng viên" : user.role === "STATION" ? "Máy trạm Lab" : "Quản trị viên"}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2.5">
          <Link
            href="/"
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Về Trang Chủ
          </Link>
          <Link
            href="/login"
            className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <LogIn className="h-4 w-4" />
            Đổi tài khoản đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
