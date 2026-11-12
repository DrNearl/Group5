"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Globe,
  KeyRound,
  Moon,
  Settings,
  Sun,
  Volume2,
  VolumeX,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { Locale } from "@/lib/i18n";
import { getAssetPath } from "@/lib/asset-path";

function SettingsContent() {
  const { user, role } = useAuth();
  const { lang, setLang, t } = useLanguage();

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("vlu_theme");
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      setSoundEnabled(localStorage.getItem("vlu_sound") !== "off");
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleThemeChange = (next: "light" | "dark") => {
    setTheme(next);
    try {
      localStorage.setItem("vlu_theme", next);
    } catch {}
    document.documentElement.setAttribute("data-theme", next);
  };

  const handleSoundToggle = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem("vlu_sound", next ? "on" : "off");
    } catch {}
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwStatus(null);
    if (newPassword.length < 6) {
      setPwStatus({ type: "err", text: t.settings.passwordTooShort });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwStatus({ type: "err", text: t.settings.passwordMismatch });
      return;
    }

    setPwSubmitting(true);
    try {
      const res = await fetch(getAssetPath("/api/auth/change-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPwStatus({ type: "ok", text: data.message });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwStatus({ type: "err", text: data.message });
      }
    } catch {
      setPwStatus({ type: "err", text: "Lỗi kết nối máy chủ." });
    } finally {
      setPwSubmitting(false);
    }
  };

  const langOptions: Array<{ code: Locale; label: string; sub: string; flag: string }> = [
    { code: "vi", label: t.settings.viLabel, sub: t.settings.viSub, flag: "VN" },
    { code: "en", label: t.settings.enLabel, sub: t.settings.enSub, flag: "EN" },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <header className="flex items-center gap-3 border-b border-gray-200 pb-5">
          <Link
            href="/dashboard"
            className="p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 shadow-xs transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="h-6 w-6 text-rose-500" />
              {t.settings.title}
            </h1>
            <p className="text-xs text-gray-500">{t.settings.subtitle}</p>
          </div>
        </header>

        {/* 1. NGÔN NGỮ HIỂN THỊ */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{t.settings.languageTitle}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{t.settings.languageDesc}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {langOptions.map((opt) => {
              const active = lang === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setLang(opt.code)}
                  className={`flex items-center justify-between p-4 rounded-xl border text-left transition cursor-pointer ${
                    active
                      ? "border-rose-500 bg-rose-50/50 ring-1 ring-rose-500"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                        active ? "bg-rose-600 text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {opt.flag}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{opt.label}</div>
                      <div className="text-[11px] text-gray-500">{opt.sub}</div>
                    </div>
                  </div>
                  {active && <CheckCircle2 className="h-5 w-5 text-rose-600 shrink-0" />}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-400">{t.settings.savedHint}</p>
        </section>

        {/* 2. GIAO DIỆN SÁNG / TỐI */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{t.settings.themeTitle}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{t.settings.themeDesc}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              className={`flex items-center justify-between p-4 rounded-xl border text-left transition cursor-pointer ${
                theme === "light"
                  ? "border-rose-500 bg-rose-50/50 ring-1 ring-rose-500"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Sun className={`h-5 w-5 ${theme === "light" ? "text-rose-600" : "text-gray-500"}`} />
                <div>
                  <div className="text-sm font-bold text-gray-900">{t.settings.lightLabel}</div>
                  <div className="text-[11px] text-gray-500">{t.settings.lightSub}</div>
                </div>
              </div>
              {theme === "light" && <CheckCircle2 className="h-5 w-5 text-rose-600 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              className={`flex items-center justify-between p-4 rounded-xl border text-left transition cursor-pointer ${
                theme === "dark"
                  ? "border-rose-500 bg-rose-50/50 ring-1 ring-rose-500"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Moon className={`h-5 w-5 ${theme === "dark" ? "text-rose-600" : "text-gray-500"}`} />
                <div>
                  <div className="text-sm font-bold text-gray-900">{t.settings.darkLabel}</div>
                  <div className="text-[11px] text-gray-500">{t.settings.darkSub}</div>
                </div>
              </div>
              {theme === "dark" && <CheckCircle2 className="h-5 w-5 text-rose-600 shrink-0" />}
            </button>
          </div>
        </section>

        {/* 3. ÂM THANH TẠI TRẠM QUÉT QR */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-gray-400" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{t.settings.soundTitle}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{t.settings.soundDesc}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSoundToggle}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition shrink-0 cursor-pointer ${
              soundEnabled
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
            }`}
          >
            {soundEnabled ? t.settings.soundOn : t.settings.soundOff}
          </button>
        </section>

        {/* 4. TÀI KHOẢN & ĐỔI MẬT KHẨU */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">{t.settings.accountTitle}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{t.settings.accountDesc}</p>
              </div>
            </div>
            {user && (
              <div className="text-right text-xs">
                <div className="font-bold text-gray-900">{user.fullName}</div>
                <div className="text-[11px] text-gray-400 font-mono">{role}</div>
              </div>
            )}
          </div>

          {pwStatus && (
            <div
              className={`rounded-xl p-3 text-xs font-medium border ${
                pwStatus.type === "ok"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              {pwStatus.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <input
              type="password"
              required
              placeholder={t.settings.currentPassword}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-rose-400"
            />
            <input
              type="password"
              required
              placeholder={t.settings.newPassword}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-rose-400"
            />
            <input
              type="password"
              required
              placeholder={t.settings.confirmPassword}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-rose-400"
            />
            <div className="sm:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={pwSubmitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition"
              >
                {pwSubmitting ? t.settings.savingPasswordBtn : t.settings.savePasswordBtn}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default function SettingsPageView() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "LECTURER"]}>
      <SettingsContent />
    </ProtectedRoute>
  );
}
