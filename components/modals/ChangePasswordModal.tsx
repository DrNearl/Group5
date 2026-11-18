"use client";

import React, { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { getAssetPath } from "@/lib/asset-path";
import { useLanguage } from "@/lib/language-context";

interface ChangePasswordModalProps {
  onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const { lang, t } = useLanguage();
  const copy = t.passwordDialog;
  const dialogRef = useRef<HTMLDivElement>(null);
  const successTimerRef = useRef<number | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();

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
      if (focusable.length === 0) return;

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
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (successTimerRef.current !== null) window.clearTimeout(successTimerRef.current);
    };
  }, [onClose]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (newPassword.length < 8) {
      setErrorMessage(copy.tooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage(copy.mismatch);
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMessage(copy.sameAsCurrent);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(getAssetPath("/api/auth/change-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": lang,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setErrorMessage(data?.message || copy.requestFailed);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage(data.message || copy.success);
      successTimerRef.current = window.setTimeout(onClose, 1200);
    } catch {
      setErrorMessage(copy.requestFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPasswordField = (
    field: "current" | "next" | "confirm",
    id: string,
    label: string,
    value: string,
    setValue: (next: string) => void,
    autoComplete: "current-password" | "new-password"
  ) => (
    <label htmlFor={id} className="block space-y-1.5 text-sm font-medium text-gray-700">
      <span>{label}</span>
      <span className="relative block">
        <input
          id={id}
          type={visible[field] ? "text" : "password"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete={autoComplete}
          required
          disabled={isSubmitting || Boolean(successMessage)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-11 text-gray-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
        />
        <button
          type="button"
          onClick={() => setVisible((previous) => ({ ...previous, [field]: !previous[field] }))}
          aria-label={visible[field] ? copy.hidePassword : copy.showPassword}
          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-lg text-gray-500 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        >
          {visible[field] ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );

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
        aria-labelledby="change-password-title"
        aria-describedby="change-password-description"
        className="my-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-5 flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
            <LockKeyhole aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 id="change-password-title" className="text-base font-bold text-gray-900">{copy.title}</h2>
            <p id="change-password-description" className="mt-1 text-sm text-gray-600">{copy.description}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {renderPasswordField("current", "current-password", copy.currentPassword, currentPassword, setCurrentPassword, "current-password")}
          {renderPasswordField("next", "new-password", copy.newPassword, newPassword, setNewPassword, "new-password")}
          {renderPasswordField("confirm", "confirm-password", copy.confirmPassword, confirmPassword, setConfirmPassword, "new-password")}

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
              disabled={isSubmitting || Boolean(successMessage)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
              {isSubmitting ? copy.submitting : copy.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
