"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Globe,
  Moon,
  Settings,
  Sun,
  Volume2,
  VolumeX,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/lib/language-context";
import { Locale } from "@/lib/i18n";

function SettingsContent() {
  const { lang, setLang, t } = useLanguage();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

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

  const langOptions: Array<{ code: Locale; label: string; flag: string }> = [
    { code: "vi", label: t.settings.viLabel, flag: "VN" },
    { code: "en", label: t.settings.enLabel, flag: "EN" },
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
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-rose-500" />
            {t.settings.title}
          </h1>
        </header>

        {/* 1. NGÔN NGỮ */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0">
              <Globe className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">{t.settings.languageTitle}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {langOptions.map((opt) => {
              const active = lang === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setLang(opt.code)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition cursor-pointer ${
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
                    <span className="text-sm font-bold text-gray-900">{opt.label}</span>
                  </div>
                  {active && <CheckCircle2 className="h-5 w-5 text-rose-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. GIAO DIỆN */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
            <h2 className="text-sm font-bold text-gray-900">{t.settings.themeTitle}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition cursor-pointer ${
                theme === "light"
                  ? "border-rose-500 bg-rose-50/50 ring-1 ring-rose-500"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Sun className={`h-5 w-5 ${theme === "light" ? "text-rose-600" : "text-gray-500"}`} />
                <span className="text-sm font-bold text-gray-900">{t.settings.lightLabel}</span>
              </div>
              {theme === "light" && <CheckCircle2 className="h-5 w-5 text-rose-600 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition cursor-pointer ${
                theme === "dark"
                  ? "border-rose-500 bg-rose-50/50 ring-1 ring-rose-500"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Moon className={`h-5 w-5 ${theme === "dark" ? "text-rose-600" : "text-gray-500"}`} />
                <span className="text-sm font-bold text-gray-900">{t.settings.darkLabel}</span>
              </div>
              {theme === "dark" && <CheckCircle2 className="h-5 w-5 text-rose-600 shrink-0" />}
            </button>
          </div>
        </section>

        {/* 3. ÂM THANH QUÉT QR */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-gray-400" />}
            </div>
            <h2 className="text-sm font-bold text-gray-900">{t.settings.soundTitle}</h2>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={soundEnabled}
            aria-label={t.settings.soundTitle}
            onClick={handleSoundToggle}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
              soundEnabled ? "bg-emerald-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                soundEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
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
