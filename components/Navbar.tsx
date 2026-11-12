"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { getAssetPath } from "@/lib/asset-path";
import {
  LogOut,
  LogIn,
} from "lucide-react";

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const { t } = useLanguage();

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white px-4 py-2.5 font-sans sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* LOGO TRƯỜNG ĐẠI HỌC VĂN LANG */}
        <Link href="/" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2">
          <img
            src={getAssetPath("/vlu-logo.png")}
            alt="Logo Đại học Văn Lang"
            className="h-8 sm:h-9 w-auto object-contain"
          />
        </Link>

        {/* THÔNG TIN NGƯỜI DÙNG & VAI TRÒ HOẶC NÚT ĐĂNG NHẬP */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              {/* Badge Vai trò */}
              <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {user.fullName}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    {user.studentCode}
                  </div>
                </div>
              </div>

              {/* Nút Đăng xuất */}
              <button
                onClick={() => logout()}
                aria-label={t.nav.signOut}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-transparent text-gray-600 transition-colors duration-150 hover:border-red-200 hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
                title={t.nav.signOut}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{t.nav.signIn}</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
