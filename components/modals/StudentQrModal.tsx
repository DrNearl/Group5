"use client";

import React, { useEffect, useState } from "react";
import { QrCode, X, Download, Mail, RefreshCw, ShieldCheck, AlertCircle } from "lucide-react";
import { getAssetPath } from "@/lib/asset-path";

interface StudentQrModalProps {
  student: any;
  userId?: string;
  userEmail?: string;
  username?: string;
  onClose: () => void;
  onUpdated: () => void;
}

export default function StudentQrModal({
  student,
  userId,
  userEmail,
  username,
  onClose,
  onUpdated,
}: StudentQrModalProps) {
  const [ttlDays, setTtlDays] = useState<number>(90);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrVersion, setQrVersion] = useState<number>(student?.qrVersion || 1);
  const [qrSentAt, setQrSentAt] = useState<string | null>(student?.qrSentAt || null);
  const [expiresAtSec, setExpiresAtSec] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyAction, setBusyAction] = useState<"SEND_EMAIL" | "REISSUE" | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const staffHeaders: Record<string, string> = {
    ...(userId ? { "x-vlu-user-id": userId } : {}),
    ...(userEmail ? { "x-vlu-user-email": userEmail } : {}),
    ...(username ? { "x-vlu-username": username } : {}),
  };

  const authHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...staffHeaders,
  };

  const loadQrPreview = async (days: number) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(
        getAssetPath(`/api/students/qr?studentId=${encodeURIComponent(student.id)}&ttlDays=${days}`),
        { headers: staffHeaders }
      );
      const data = await res.json();
      if (data.success) {
        setQrDataUrl(data.qrDataUrl);
        setQrVersion(data.qrVersion);
        setQrSentAt(data.qrSentAt);
        setExpiresAtSec(data.expiresAtSec || 0);
      } else {
        setFeedback({ ok: false, text: data.message || "Không thể tải mã QR." });
      }
    } catch (e: any) {
      setFeedback({ ok: false, text: "Lỗi kết nối: " + e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (student?.id) {
      loadQrPreview(ttlDays);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id, ttlDays]);

  const handleAction = async (action: "SEND_EMAIL" | "REISSUE") => {
    if (
      action === "REISSUE" &&
      !confirm(
        `Thu hồi Thẻ QR hiện tại và cấp mã mới cho ${student.fullName}? Mã cũ sẽ lập tức mất hiệu lực khi quét!`
      )
    ) {
      return;
    }

    setBusyAction(action);
    setFeedback(null);
    try {
      const res = await fetch(getAssetPath("/api/students/qr"), {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          studentId: student.id,
          action,
          ttlDays,
          sendEmail: action === "SEND_EMAIL",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQrDataUrl(data.qrDataUrl);
        setQrVersion(data.qrVersion);
        setQrSentAt(data.qrSentAt);
        setExpiresAtSec(data.expiresAtSec || 0);
        const sentOk = data.emailResult ? Boolean(data.emailResult.sent) : true;
        setFeedback({ ok: sentOk, text: data.message });
        onUpdated();
      } else {
        setFeedback({ ok: false, text: data.message || "Thao tác thất bại." });
      }
    } catch (e: any) {
      setFeedback({ ok: false, text: "Lỗi kết nối: " + e.message });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `VLU-QR-${student.studentCode}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2 text-rose-700">
            <QrCode className="h-5 w-5" />
            <h3 className="font-bold text-sm">Thẻ QR Điểm Danh Cá Nhân</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-bold text-gray-900 text-sm">{student.fullName}</div>
              <div className="text-gray-500 font-mono">
                {student.studentCode} • {student.className || "CNTT"}
              </div>
              <div className="text-gray-400 truncate max-w-[230px]">{student.email}</div>
            </div>
            <div className="text-right shrink-0 space-y-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                <ShieldCheck className="h-3 w-3" />
                Đang hoạt động
              </span>
              <div className="text-[10px] text-gray-400">
                {qrSentAt
                  ? `Đã gửi: ${new Date(qrSentAt).toLocaleDateString("vi-VN")}`
                  : "Chưa gửi email"}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col items-center">
            {loading ? (
              <div className="h-52 w-52 flex items-center justify-center text-gray-400">
                Đang tạo mã QR ký HMAC...
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR ${student.studentCode}`}
                className="h-52 w-52 rounded-xl border border-gray-200 bg-white shadow-xs"
              />
            ) : null}

            <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-600">
              <span>Thời hạn hiệu lực:</span>
              <select
                value={ttlDays}
                onChange={(e) => setTtlDays(Number(e.target.value))}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-700 font-medium focus:outline-none focus:border-rose-400"
              >
                <option value={90}>90 ngày (1 học kỳ)</option>
                <option value={180}>180 ngày (1 năm)</option>
                <option value={0}>Không hết hạn</option>
              </select>
            </div>
            {expiresAtSec > 0 && (
              <div className="text-[10px] text-gray-400 mt-1">
                Hết hạn vào: {new Date(expiresAtSec * 1000).toLocaleDateString("vi-VN")}
              </div>
            )}
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2 ${
                feedback.ok
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={!qrDataUrl || loading}
              className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Tải ảnh PNG
            </button>
            <button
              type="button"
              onClick={() => handleAction("SEND_EMAIL")}
              disabled={busyAction !== null || loading}
              className="px-3 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 shadow-xs transition disabled:opacity-50"
            >
              <Mail className="h-3.5 w-3.5" />
              {busyAction === "SEND_EMAIL" ? "Đang gửi..." : "Gửi vào Email"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleAction("REISSUE")}
            disabled={busyAction !== null || loading}
            className="w-full px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busyAction === "REISSUE" ? "animate-spin" : ""}`} />
            {busyAction === "REISSUE"
              ? "Đang cấp lại..."
              : "Cấp lại mã QR mới (Thu hồi mã cũ)"}
          </button>
        </div>
      </div>
    </div>
  );
}
