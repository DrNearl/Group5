"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth, UserRole } from "@/lib/auth-context";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  History,
  LayoutDashboard,
  Menu,
  QrCode,
  Users,
  Shield,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navigationByRole: Record<string, SidebarItem[]> = {
  ADMIN: [
    { href: "/", label: "Trạm Quét QR", icon: QrCode },
    { href: "/dashboard", label: "Giám Sát Phòng Lab", icon: BarChart3 },
    { href: "/students", label: "Danh Sách Sinh Viên", icon: Users },
    { href: "/users", label: "Tài Khoản & Phân Quyền", icon: Shield },
    { href: "/audit-logs", label: "Nhật Ký Thao Tác", icon: History },
  ],
  LECTURER: [
    { href: "/", label: "Trạm Quét QR", icon: QrCode },
    { href: "/dashboard", label: "Giám Sát Phòng Lab", icon: BarChart3 },
    { href: "/students", label: "Danh Sách Sinh Viên", icon: Users },
  ],
};

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { role } = useAuth();
  const items = (role && navigationByRole[role]) ? navigationByRole[role] : (navigationByRole["ADMIN"] || []);

  return (
    <nav aria-label="Chức năng hệ thống" className="h-full overflow-y-auto bg-white p-3">
      <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">MENU</p>
      <ul className="space-y-1">
        {(items || []).map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1 ${active
                  ? "bg-red-50 text-red-800"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-950"
                  }`}
              >
                <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${active ? "text-red-700" : "text-gray-500"}`} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SignedInLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <>
      <div className="flex min-h-[calc(100dvh-53px)]">
        <aside className="sticky top-[53px] hidden h-[calc(100dvh-53px)] w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
          <Sidebar />
        </aside>
        <div className="min-w-0 flex-1">
          <div className="border-b border-gray-200 bg-white px-4 py-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-system-navigation"
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
            >
              <Menu aria-hidden="true" className="h-4 w-4" />
              Menu chức năng
            </button>
          </div>
          <main id="main-content" className="min-w-0">{children}</main>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Đóng menu chức năng"
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            id="mobile-system-navigation"
            aria-label="Menu chức năng"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-gray-200 bg-white shadow-lg"
          >
            <div className="flex min-h-14 items-center justify-between border-b border-gray-200 px-4">
              <span className="text-sm font-semibold text-gray-900">Chức năng hệ thống</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Đóng menu chức năng"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/register") return <>{children}</>;
  if (pathname === "/" || pathname === "/scan-station") return <main id="main-content">{children}</main>;

  return (
    <>
      <Navbar />
      {user ? <SignedInLayout>{children}</SignedInLayout> : <main id="main-content">{children}</main>}
    </>
  );
}
