"use client";

import React, { useEffect, useRef, useState } from "react";
import { LoaderCircle, UserRound } from "lucide-react";
import { getAssetPath } from "@/lib/asset-path";
import { useLanguage } from "@/lib/language-context";

interface Profile {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

interface ProfileModalProps {
  onClose: () => void;
  onSaved: (profile: Pick<Profile, "fullName">) => void;
}

function normalizePhone(value: string) {
  return value.replace(/[\s().-]/g, "");
}

function isValidVietnamPhone(value: string) {
  return /^(?:0(?:[35789]\d{8}|2\d{8,9})|\+?84(?:[35789]\d{8}|2\d{8,9}))$/.test(value);
}

export default function ProfileModal({ onClose, onSaved }: ProfileModalProps) {
  const { lang, t } = useLanguage();
  const copy = t.profileDialog;
  const dialogRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>("input:not([disabled]), button:not([disabled])");
    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>("input:not([disabled]), button:not([disabled])") ?? []
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const response = await fetch(getAssetPath("/api/auth/profile"), {
          headers: { "Accept-Language": lang },
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success || !data.user) {
          throw new Error(data?.message || copy.loadFailed);
        }
        if (!cancelled) {
          setProfile({
            username: data.user.username,
            fullName: data.user.fullName,
            email: data.user.email,
            phone: data.user.phone || "",
            role: data.user.role,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : copy.loadFailed);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [copy.loadFailed, lang]);

  const setField = (field: "fullName" | "email" | "phone", value: string) => {
    setProfile((previous) => previous ? { ...previous, [field]: value } : previous);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    if (!profile) return;

    const fullName = profile.fullName.trim();
    const email = profile.email.trim().toLowerCase();
    const phone = normalizePhone(profile.phone.trim());
    if (!fullName) {
      setErrorMessage(copy.nameRequired);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setErrorMessage(copy.invalidEmail);
      return;
    }
    if (phone && !isValidVietnamPhone(phone)) {
      setErrorMessage(copy.invalidPhone);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(getAssetPath("/api/auth/profile"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": lang,
        },
        body: JSON.stringify({ fullName, email, phone }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success || !data.user) {
        setErrorMessage(data?.message || copy.saveFailed);
        return;
      }

      const savedProfile: Profile = {
        username: data.user.username,
        fullName: data.user.fullName,
        email: data.user.email,
        phone: data.user.phone || "",
        role: data.user.role,
      };
      setProfile(savedProfile);
      onSaved({ fullName: savedProfile.fullName });
      setSuccessMessage(data.message || copy.success);
    } catch {
      setErrorMessage(copy.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const roleLabel = profile?.role === "ADMIN" ? copy.adminRole : copy.lecturerRole;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-dialog-title"
        aria-describedby="profile-dialog-description"
        className="my-auto w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-5 flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
            <UserRound aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 id="profile-dialog-title" className="text-base font-bold text-gray-900">{copy.title}</h2>
            <p id="profile-dialog-description" className="mt-1 text-sm text-gray-600">{copy.description}</p>
          </div>
        </div>

        {isLoading ? (
          <div role="status" className="flex min-h-40 items-center justify-center gap-2 text-sm text-gray-600">
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            {copy.loading}
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {profile && (
              <>
                <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-medium text-gray-500">{copy.username}</div>
                    <div className="mt-1 break-all text-sm font-semibold text-gray-800">{profile.username}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500">{copy.role}</div>
                    <div className="mt-1 text-sm font-semibold text-gray-800">{roleLabel}</div>
                  </div>
                </div>

                <label htmlFor="profile-full-name" className="block space-y-1.5 text-sm font-medium text-gray-700">
                  <span>{copy.fullName}</span>
                  <input
                    id="profile-full-name"
                    value={profile.fullName}
                    onChange={(event) => setField("fullName", event.target.value)}
                    disabled={isSaving}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>

                <label htmlFor="profile-email" className="block space-y-1.5 text-sm font-medium text-gray-700">
                  <span>{copy.email}</span>
                  <input
                    id="profile-email"
                    type="email"
                    value={profile.email}
                    onChange={(event) => setField("email", event.target.value)}
                    autoComplete="email"
                    disabled={isSaving}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>

                <label htmlFor="profile-phone" className="block space-y-1.5 text-sm font-medium text-gray-700">
                  <span>{copy.phone}</span>
                  <input
                    id="profile-phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(event) => setField("phone", event.target.value)}
                    autoComplete="tel"
                    disabled={isSaving}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>
              </>
            )}

            {errorMessage && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {errorMessage}
              </p>
            )}
            {successMessage && (
              <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {successMessage}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
              >
                {copy.cancel}
              </button>
              <button
                type="submit"
                disabled={isLoading || isSaving || !profile}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
                {isSaving ? copy.saving : copy.save}
              </button>
            </div>
          </form>
        )}
        {isLoading && (
          <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
            >
              {copy.cancel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
