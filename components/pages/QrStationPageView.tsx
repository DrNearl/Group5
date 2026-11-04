"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { soundFX } from "@/lib/audio";
import {
  QrCode,
  Clock,
  ArrowLeft,
  Volume2,
  VolumeX,
  Laptop,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  History,
  ShieldCheck,
  Smartphone,
  Lock,
  KeyRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";

interface QrSessionData {
  token: string;
  checkInUrl: string;
  expiresAt: number;
  ttl: number;
  labName: string;
}

function QrStationContent() {
  const router = useRouter();
  const { role } = useAuth();
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinCode, setPinCode] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);

  const [qrSession, setQrSession] = useState<QrSessionData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(20);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const lastLogIdRef = useRef<string | null>(null);

  const handleExitClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push("/");
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode === "1234" || pinCode === "admin123") {
      setShowPinModal(false);
      router.push("/");
    } else {
      setPinError("Mã PIN bảo vệ không chính xác! (Mặc định: 1234)");
    }
  };

  // 1. Đồng hồ thời gian thực
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setCurrentDate(
        now.toLocaleDateString("vi-VN", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch mã QR Token mới mỗi 20 giây
  const fetchNewQrToken = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/qr/session?labCode=LAB-A518");
      const data = await res.json();
      if (data.success) {
        setQrSession(data);
        setSecondsLeft(data.ttl || 20);
      }
    } catch (err) {
      console.error("Lỗi cấp phát QR session:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Khởi tạo QR lần đầu
  useEffect(() => {
    fetchNewQrToken();
  }, [fetchNewQrToken]);

  // Bộ đếm ngược 20s chuyển động mượt mà
  useEffect(() => {
    const countdownTimer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          fetchNewQrToken();
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [fetchNewQrToken]);

  // 3. Polling danh sách SV vừa điểm danh trực tiếp hôm nay (mỗi 3 giây)
  const fetchLiveLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/qr/live");
      const data = await res.json();
      if (data.success && data.logs) {
        // Kiểm tra xem có lượt quét mới nhất không để phát âm thanh
        if (data.logs.length > 0) {
          const newest = data.logs[0];
          if (lastLogIdRef.current && lastLogIdRef.current !== newest.id && isSoundEnabled) {
            if (newest.checkOutTime) {
              soundFX.playCheckOut();
            } else {
              soundFX.playCheckIn();
            }
          }
          lastLogIdRef.current = newest.id;
        }
        setRecentLogs(data.logs);
      }
    } catch (err) {
      console.error("Lỗi live feed:", err);
    }
  }, [isSoundEnabled]);

  useEffect(() => {
    fetchLiveLogs();
    const interval = setInterval(fetchLiveLogs, 3500);
    return () => clearInterval(interval);
  }, [fetchLiveLogs]);

  // Format thời lượng có mặt
  const formatFriendlyDuration = (checkIn: string, checkOut?: string | null) => {
    if (!checkOut) {
      const elapsedSec = Math.max(1, Math.floor((Date.now() - new Date(checkIn).getTime()) / 1000));
      const m = Math.floor(elapsedSec / 60);
      return m > 0 ? `Đang có mặt (${m} phút)` : "Đang có mặt (< 1 phút)";
    }
    const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const totalSec = Math.max(1, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h} giờ ${m} phút ${s} giây`;
    if (m > 0) return `${m} phút ${s} giây`;
    return `${s} giây`;
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans flex flex-col selection:bg-red-500 selection:text-white">
      {/* 1. TOP HEADER (LIGHT MODE - SẮC NÉT & KHOA HỌC) */}
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur-md px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={handleExitClick}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            title="Thoát khỏi màn hình trạm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div
            className="h-9 w-9 rounded-xl bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center shadow-sm text-white flex-shrink-0"
            title="Trạm Dynamic QR Code"
          >
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              TRẠM ĐIỂM DANH MÃ QR PHÒNG LAB
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 tracking-normal flex items-center gap-1">
                <RefreshCw className="h-3 w-3 text-emerald-600" />
                TỰ ĐỘNG CẬP NHẬT
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Sinh viên dùng điện thoại quét mã QR để điểm danh ca trực
            </p>
          </div>
        </div>

        {/* PHÒNG MÁY + NÚT ÂM THANH + ĐỒNG HỒ NAVY ĐẬM */}
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 px-3.5 py-2 rounded-xl border border-gray-200 text-xs flex items-center gap-2.5">
            <Laptop className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-semibold">Phòng máy:</div>
              <div className="font-bold text-gray-900">Phòng 5.18 - Lầu 5, Tòa A (Cơ sở chính)</div>
            </div>
          </div>

          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs flex items-center gap-2 transition shadow-sm"
            title={isSoundEnabled ? "Nhấn để tắt âm thanh chuông" : "Nhấn để bật âm thanh chuông"}
          >
            {isSoundEnabled ? (
              <Volume2 className="h-4 w-4 text-red-500" />
            ) : (
              <VolumeX className="h-4 w-4 text-gray-400" />
            )}
            <span className="font-semibold text-gray-700 hidden sm:inline">
              {isSoundEnabled ? "Âm thanh: BẬT" : "Âm thanh: TẮT"}
            </span>
          </button>

          {/* ĐỒNG HỒ NAVY ĐẬM */}
          <div className="text-right pl-3 border-l border-gray-200">
            <div className="text-2xl font-mono font-extrabold tracking-wider text-[#111827] flex items-center gap-2 justify-end">
              <Clock className="h-5 w-5 text-[#1E3A8A]" />
              {currentTime || "00:00:00"}
            </div>
            <div className="text-xs font-medium text-slate-500 capitalize">{currentDate}</div>
          </div>
        </div>
      </header>

      {/* 2. NỘI DUNG CHÍNH (2 CỘT CÂN ĐỐI) */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        {/* CỘT TRÁI (5 CỘT): KHỐI MÃ QR CODE ĐỘNG & BỘ ĐẾM 15 GIÂY */}
        <section className="lg:col-span-5 flex flex-col">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col items-center justify-between space-y-6 relative overflow-hidden">
            {/* Header của thẻ QR */}
            <div className="w-full flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-red-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Quét Bằng Điện Thoại
                </h2>
              </div>

              {/* Nút Refresh thủ công */}
              <button
                onClick={fetchNewQrToken}
                disabled={isRefreshing}
                className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 transition"
                title="Tạo mới mã ngay lập tức"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-red-600" : ""}`} />
                Đổi mã
              </button>
            </div>

            {/* KHUNG MÃ QR KÍCH THƯỚC LỚN SẮC NÉT */}
            <div className="relative p-4 rounded-2xl bg-white border-2 border-gray-100 shadow-md flex items-center justify-center group">
              {/* 4 Góc định vị quang học */}
              <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-red-500 rounded-tl-md pointer-events-none" />
              <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-red-500 rounded-tr-md pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-red-500 rounded-bl-md pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-red-500 rounded-br-md pointer-events-none" />

              {qrSession ? (
                <QRCodeSVG
                  value={qrSession.checkInUrl}
                  size={280}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: "/favicon.ico",
                    x: undefined,
                    y: undefined,
                    height: 36,
                    width: 36,
                    excavate: true,
                  }}
                />
              ) : (
                <div className="w-[280px] h-[280px] flex flex-col items-center justify-center text-gray-400 space-y-2">
                  <RefreshCw className="h-8 w-8 animate-spin text-red-600" />
                  <span className="text-xs font-medium">Đang khởi tạo mã QR...</span>
                </div>
              )}
            </div>

            {/* THANH TIẾN TRÌNH & ĐẾM NGƯỢC */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Mã đổi sau:
                </span>
                <span className="font-mono text-sm font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                  {secondsLeft}s
                </span>
              </div>

              {/* Progress Bar 20s */}
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${(secondsLeft / 20) * 100}%` }}
                />
              </div>
            </div>

            {/* BANNER HƯỚNG DẪN MÀU CHARCOAL */}
            <div className="w-full bg-zinc-900/90 text-amber-200 p-3 rounded-xl border border-zinc-700/60 shadow-xs text-center text-xs space-y-1">
              <div className="font-bold text-white flex items-center justify-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-300" />
                Mở camera điện thoại để quét mã
              </div>
              <p className="text-[11px] text-zinc-300 font-normal">
                Mã tự động làm mới định kỳ tại phòng máy
              </p>
            </div>
          </div>
        </section>

        {/* CỘT PHẢI (7 CỘT): DANH SÁCH SINH VIÊN VỪA ĐIỂM DANH THỜI GIAN THỰC */}
        <section className="lg:col-span-7 flex flex-col">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex-1 flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Sinh Viên Vừa Điểm Danh Hôm Nay
                </h3>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                Tự động cập nhật mỗi 3s
              </span>
            </div>

            {/* BẢNG LOGS REAL-TIME */}
            <div className="flex-1 overflow-y-auto max-h-[500px] rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50/90 text-gray-600 uppercase text-[10px] font-bold tracking-wider sticky top-0 border-b border-gray-200 z-10">
                  <tr>
                    <th className="py-3 px-4">Sinh viên</th>
                    <th className="py-3 px-4">Giờ Check-in</th>
                    <th className="py-3 px-4">Giờ Check-out</th>
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {recentLogs.length > 0 ? (
                    recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3.5 px-4 font-sans">
                          <div className="font-bold text-slate-900 text-xs">{log.studentName}</div>
                          <div className="text-[11px] text-slate-500 font-mono font-medium flex items-center gap-2">
                            <span>{log.studentCode}</span>
                            {log.scanMethod === "DYNAMIC_QR" && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded font-sans font-semibold">
                                Quét QR
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-emerald-700 font-bold text-xs">
                          {log.checkInTime
                            ? new Date(log.checkInTime).toLocaleTimeString("vi-VN")
                            : "--:--"}
                        </td>
                        <td className="py-3.5 px-4 text-blue-700 font-bold text-xs">
                          {log.checkOutTime ? (
                            new Date(log.checkOutTime).toLocaleTimeString("vi-VN")
                          ) : (
                            <span className="text-slate-500 font-normal">Đang trong Lab</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-900 font-bold text-xs">
                          {formatFriendlyDuration(log.checkInTime, log.checkOutTime)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-sans">
                          {log.checkOutTime ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1.5 shadow-2xs">
                              Đã Check-out
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Đang có mặt
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400 font-sans">
                        Chưa có lượt điểm danh nào trong hôm nay
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* FOOTER HƯỚNG DẪN */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Dữ liệu điểm danh được cập nhật tự động vào hệ thống.
              </span>
              <span className="font-medium text-slate-700">
                Tổng lượt hôm nay: {recentLogs.length}
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* MODAL MÃ PIN BẢO VỆ CHẾ ĐỘ KIOSK */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <Lock className="h-4 w-4 text-red-600" />
                Xác Thực Thoát Kiosk
              </div>
              <button
                onClick={() => setShowPinModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Màn hình trạm đang ở chế độ Kiosk bảo vệ. Vui lòng nhập mã PIN quản trị viên để thoát ra màn hình chính.
            </p>

            <form onSubmit={handleVerifyPin} className="space-y-3">
              {pinError && (
                <div className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {pinError}
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                  Mã PIN Bảo Vệ (Mặc định: 1234)
                </label>
                <input
                  type="password"
                  autoFocus
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="Nhập mã PIN..."
                  className="w-full text-center tracking-widest text-lg font-mono font-bold bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 focus:border-red-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm"
                >
                  Xác Nhận Thoát
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QrStationPageView() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "LECTURER"]}>
      <QrStationContent />
    </ProtectedRoute>
  );
}
