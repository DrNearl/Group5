"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import VluLogo from "@/components/VluLogo";
import ChangePasswordModal from "@/components/modals/ChangePasswordModal";
import ProfileModal from "@/components/modals/ProfileModal";
import {
  ChevronDown,
  CircleUserRound,
  KeyRound,
  LogOut,
  LogIn,
  UserRound,
} from "lucide-react";

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const { t } = useLanguage();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [displayName, setDisplayName] = useState(user?.fullName ?? "");
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setDisplayName(user?.fullName ?? "");
  }, [user?.id, user?.fullName]);

  useEffect(() => {
    if (!accountMenuOpen) return;

    menuItemRefs.current[0]?.focus();
    const handlePointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
        accountButtonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  const onOpenProfile = () => {
    setProfileOpen(true);
  };

  const onOpenChangePassword = () => {
    setChangePasswordOpen(true);
  };

  const closeChangePassword = useCallback(() => {
    setChangePasswordOpen(false);
    window.requestAnimationFrame(() => accountButtonRef.current?.focus());
  }, []);

  const closeProfile = useCallback(() => {
    setProfileOpen(false);
    window.requestAnimationFrame(() => accountButtonRef.current?.focus());
  }, []);

  const handleProfileSaved = useCallback((profile: { fullName: string }) => {
    setDisplayName(profile.fullName);
  }, []);

  const handleMenuItemKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "Tab" && event.shiftKey && index === 0) {
      setAccountMenuOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      menuItemRefs.current[(index + 1) % 3]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      menuItemRefs.current[(index + 2) % 3]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      menuItemRefs.current[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      menuItemRefs.current[2]?.focus();
    }
  };

  return (
    <>
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white px-4 py-2.5 font-sans sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* LOGO TRƯỜNG ĐẠI HỌC VĂN LANG */}
        <Link href="/" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2">
          <VluLogo className="h-8 sm:h-9 w-auto object-contain" />
        </Link>

        {/* THÔNG TIN NGƯỜI DÙNG & VAI TRÒ HOẶC NÚT ĐĂNG NHẬP */}
        <div className="flex items-center gap-3">
          {user ? (
            <div
              ref={accountMenuRef}
              className="relative max-w-[calc(100vw-5rem)]"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setAccountMenuOpen(false);
                }
              }}
            >
              <button
                ref={accountButtonRef}
                type="button"
                onClick={() => setAccountMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                aria-controls="navbar-account-menu"
                aria-label={displayName}
                className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-gray-800 transition-colors hover:border-red-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 sm:px-3"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-800 sm:hidden">
                  <CircleUserRound aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="hidden max-w-56 truncate text-sm font-semibold sm:inline">{displayName}</span>
                <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${accountMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {accountMenuOpen && (
                <div
                  id="navbar-account-menu"
                  role="menu"
                  aria-label={t.nav.accountMenu}
                  className="absolute right-0 z-[60] mt-2 w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
                >
                  <button
                    ref={(element) => { menuItemRefs.current[0] = element; }}
                    type="button"
                    role="menuitem"
                    onKeyDown={(event) => handleMenuItemKeyDown(event, 0)}
                    onClick={() => { setAccountMenuOpen(false); onOpenProfile(); }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:bg-red-50 focus-visible:text-red-800"
                  >
                    <UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-500" />
                    <span className="truncate">{t.nav.profileInfo}</span>
                  </button>
                  <button
                    ref={(element) => { menuItemRefs.current[1] = element; }}
                    type="button"
                    role="menuitem"
                    onKeyDown={(event) => handleMenuItemKeyDown(event, 1)}
                    onClick={() => { setAccountMenuOpen(false); onOpenChangePassword(); }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:bg-red-50 focus-visible:text-red-800"
                  >
                    <KeyRound aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-500" />
                    <span className="truncate">{t.nav.changePassword}</span>
                  </button>
                  <div aria-hidden="true" className="my-1.5 border-t border-gray-200" />
                  <button
                    ref={(element) => { menuItemRefs.current[2] = element; }}
                    type="button"
                    role="menuitem"
                    onKeyDown={(event) => handleMenuItemKeyDown(event, 2)}
                    onClick={() => { setAccountMenuOpen(false); void logout(); }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 transition-colors hover:bg-red-50 hover:text-red-900 focus-visible:outline-none focus-visible:bg-red-50 focus-visible:text-red-900"
                  >
                    <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t.nav.accountLogout}</span>
                  </button>
                </div>
              )}
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
    {changePasswordOpen && <ChangePasswordModal onClose={closeChangePassword} />}
    {profileOpen && <ProfileModal onClose={closeProfile} onSaved={handleProfileSaved} />}
    </>
  );
}
