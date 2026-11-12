"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Globe, Settings } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/lib/language-context";
import { Locale } from "@/lib/i18n";

function SettingsContent() {
  const { lang, setLang, t } = useLanguage();

  const options: Array<{ code: Locale; label: string; sub: string; flag: string }> = [
    { code: "vi", label: t.settings.viLabel, sub: t.settings.viSub, flag: "VN" },
    { code: "en", label: t.settings.enLabel, sub: t.settings.enSub, flag: "EN" },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {options.map((opt) => {
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

          <p className="text-[11px] text-gray-400 pt-1">{t.settings.savedHint}</p>
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
