"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { soundFX } from "@/lib/audio";
import { useAuth } from "@/lib/auth-context";
import {
  Camera,
  ShieldAlert,
  Zap,
  Clock,
  UserCheck,
  AlertTriangle,
  Laptop,
  CheckCircle2,
  XCircle,
  RefreshCw,
  History,
  Sparkles,
  LogIn,
  LogOut,
  Volume2,
  VolumeX,
  ArrowLeft,
  LayoutDashboard,
} from "lucide-react";

interface ScanResult {
  logId?: string;
  studentName: string;
  studentCode: string;
  labName: string;
  checkInTime: string;
  checkOutTime?: string | null;
  totalHours?: number;
  durationText?: string;
  scanMethod: string;
  snapshot?: string | null;
  action: "CHECK_IN" | "CHECK_OUT";
  message: string;
}

interface EquipmentData {
  id: string;
  equipmentBarcode: string;
  equipmentName: string;
  category: string;
  status: string;
  labName: string;
  building: string;
  specifications?: string;
  activeIncidents: any[];
}

function stopScannerInstance(scanner: any) {
  if (!scanner) return;

  try {
    const stopResult = scanner.stop?.();
    if (stopResult && typeof stopResult.catch === "function") {
      stopResult.catch(() => {}).finally(() => {
        try {
          scanner.clear?.();
        } catch {}
      });
    } else {
      scanner.clear?.();
    }
  } catch {
    try {
      scanner.clear?.();
    } catch {}
  }
}

function stopVideoStreams(container: HTMLElement | null, storedStream: MediaStream | null) {
  const streams = new Set<MediaStream>();
  if (storedStream) streams.add(storedStream);

  const videos = container?.querySelectorAll("video") || [];
  videos.forEach((video) => {
    if (typeof MediaStream !== "undefined" && video.srcObject instanceof MediaStream) {
      streams.add(video.srcObject);
    }
  });

  streams.forEach((stream) => {
    stream.getTracks().forEach((track) => {
      if (track.readyState !== "ended") track.stop();
    });
  });

  videos.forEach((video) => {
    try {
      video.pause();
      video.srcObject = null;
    } catch {}
  });
}

function ScanStationContent() {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [showBigOverlay, setShowBigOverlay] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<{
    action: "CHECK_IN" | "CHECK_OUT";
    title: string;
    subtitle: string;
  } | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [scanSuccessFlash, setScanSuccessFlash] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const html5QrCodeRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const lastScannedTimeRef = useRef<{ [code: string]: number }>({});

  // Tính định dạng thời gian rõ ràng (không dùng số thập phân giờ như 0.01 giờ)
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

  // 2. Tải danh sách Logs gần đây (tự động đồng bộ mỗi 5s)
  const fetchStationData = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance/scan");
      const data = await res.json();
      if (data.success) {
        setRecentLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Lỗi nạp dữ liệu:", err);
    }
  }, []);

  useEffect(() => {
    fetchStationData();
    const interval = setInterval(fetchStationData, 5000);
    return () => clearInterval(interval);
  }, [fetchStationData]);

  // 3. Chụp Snapshot khuôn mặt từ thẻ video của html5-qrcode
  const captureSnapshot = (): string | null => {
    const video = document.querySelector("#interactive-webcam-reader video") as HTMLVideoElement;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(
      `VLU LAB SECURE SNAPSHOT • ${new Date().toLocaleString("vi-VN")}`,
      12,
      canvas.height - 10
    );

    return canvas.toDataURL("image/jpeg", 0.7);
  };

  // 4. Xử lý quét Barcode qua Backend
  const handleBarcodeProcess = async (barcode: string, scanMethod: "USB_SCANNER" | "WEBCAM") => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;

    // Chống quét trùng lặp trong 1.8 giây (đủ để kéo thẻ ra khỏi ống kính camera)
    const nowTime = Date.now();
    if (lastScannedTimeRef.current[cleanBarcode] && nowTime - lastScannedTimeRef.current[cleanBarcode] < 1800) {
      return;
    }
    lastScannedTimeRef.current[cleanBarcode] = nowTime;

    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMessage(null);

    // Hiệu ứng viền xanh
    setScanSuccessFlash(true);
    setTimeout(() => setScanSuccessFlash(false), 900);

    const snapshot = captureSnapshot();

    try {
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: cleanBarcode,
          scanMethod,
          snapshotBase64: snapshot,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        if (isSoundEnabled) soundFX.playWarning();
        setErrorMessage(data.message);
        setSuccessBanner(null);
        setIsProcessing(false);
        return;
      }

      // ĐIỂM DANH SINH VIÊN (CHECK-IN HOẶC CHECK-OUT): PHÁT ÂM THANH HIỆU ỨNG TƯƠNG ỨNG
      if (isSoundEnabled) {
        if (data.action === "CHECK_IN") {
          soundFX.playCheckIn(); // Tiếng chime đón tiếp thăng hoa
        } else {
          soundFX.playCheckOut(); // Tiếng chime hoàn thành ấm áp
        }
      }
      setErrorMessage(null);

      const actionTitle = data.action === "CHECK_IN" ? "ĐIỂM DANH VÀO THÀNH CÔNG" : "ĐIỂM DANH RA THÀNH CÔNG";
      const actionSubtitle = data.action === "CHECK_IN"
        ? `Sinh viên: ${data.data.studentName} (${data.data.studentCode}) • Giờ vào: ${new Date(data.data.checkInTime).toLocaleTimeString("vi-VN")}`
        : `Sinh viên: ${data.data.studentName} (${data.data.studentCode}) • Thời gian có mặt: ${data.data.durationText}`;

      setSuccessBanner({
        action: data.action,
        title: actionTitle,
        subtitle: actionSubtitle,
      });

      // Tự động tắt banner thành công sau 8 giây
      setTimeout(() => {
        setSuccessBanner((prev) => (prev?.title === actionTitle ? null : prev));
      }, 8000);

      setLastResult({
        ...data.data,
        action: data.action,
        message: data.message,
      });

      // Hiển thị Card xác nhận lớn giữa màn hình trong 2.5 giây
      setShowBigOverlay(true);
      setTimeout(() => setShowBigOverlay(false), 2500);

      fetchStationData();
    } catch (err: any) {
      if (isSoundEnabled) soundFX.playWarning();
      setErrorMessage("Không thể kết nối với máy chủ: " + err.message);
      setSuccessBanner(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Súng quét USB HID (Tự động bắt chuỗi súng quét barcode toàn màn hình)
  useBarcodeScanner({
    onScan: (barcode) => {
      handleBarcodeProcess(barcode, "USB_SCANNER");
    },
    minBarcodeLength: 4,
  });

  // 6. KHỞI CHẠY BỘ QUÉT CAMERA BẰNG HTML5-QRCODE (10 FPS CHUẨN, MƯỢT MÀ KHÔNG GIẬT LAG)
  useEffect(() => {
    let isCancelled = false;

    const releaseCamera = (scanner = html5QrCodeRef.current) => {
      stopScannerInstance(scanner);
      stopVideoStreams(
        document.getElementById("interactive-webcam-reader"),
        mediaStreamRef.current
      );
      mediaStreamRef.current = null;
      if (html5QrCodeRef.current === scanner) html5QrCodeRef.current = null;
    };

    async function startCameraScanner() {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (isCancelled) return;

        // Dừng và giải phóng scanner cũ nếu có
        if (html5QrCodeRef.current) {
          releaseCamera(html5QrCodeRef.current);
        }

        const container = document.getElementById("interactive-webcam-reader");
        if (!container || isCancelled) return;

        const html5QrCode = new Html5Qrcode("interactive-webcam-reader", {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });

        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10, // 10 FPS: Tần suất chuẩn giúp nhận diện cực nhạy (dưới 100ms) mà hoàn toàn không giật lag
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const w = viewfinderWidth > 0 ? viewfinderWidth : 480;
              const h = viewfinderHeight > 0 ? viewfinderHeight : 320;
              const width = Math.max(260, Math.min(Math.floor(w * 0.92), 520));
              const height = Math.max(160, Math.min(Math.floor(h * 0.65), 230));
              return { width, height };
            },
          },
          (decodedText) => {
            handleBarcodeProcess(decodedText, "WEBCAM");
          },
          () => {} // Bỏ qua frame trống để tiết kiệm tài nguyên
        );

        const video = container.querySelector("video");
        if (video?.srcObject instanceof MediaStream) {
          mediaStreamRef.current = video.srcObject;
        }

        if (isCancelled) {
          releaseCamera(html5QrCode);
          return;
        }
        setCameraActive(true);
      } catch (err) {
        if (!isCancelled) console.warn("Lỗi khởi động camera:", err);
        releaseCamera();
        if (!isCancelled) setCameraActive(false);
      }
    }

    startCameraScanner();

    return () => {
      isCancelled = true;
      releaseCamera();
    };
  }, []);

  return (
    <div suppressHydrationWarning className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans flex flex-col">
      <canvas ref={canvasRef} className="hidden" />

      {/* TOP HEADER (MINIMALIST - CORAL RED PASTEL) */}
      <header className="border-b border-gray-100 bg-white px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {pathname !== "/" && (
            <Link
              href="/"
              className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 transition"
              title="Quay lại Trang Chủ"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <img
            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/vlu-logo.png`}
            alt="Đại học Văn Lang"
            className="h-9 sm:h-10 w-auto object-contain"
          />
        </div>

        {/* BÊN PHẢI: ĐỒNG HỒ + NÚT QUẢN LÝ (TỐI GIẢN) */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right">
            <div className="text-xl font-mono font-bold tracking-wide text-gray-800 flex items-center gap-1.5 justify-end">
              <Clock className="h-4 w-4 text-gray-400" />
              {currentTime || "00:00:00"}
            </div>
            <div className="text-[11px] text-gray-400 capitalize">{currentDate}</div>
          </div>

          <div className="pl-3 border-l border-gray-100 flex items-center gap-2">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-sm shadow-rose-200 transition"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Bảng Quản Lý</span>
                </Link>
                <button
                  onClick={() => logout()}
                  title="Đăng xuất"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-sm shadow-rose-200 transition"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Đăng nhập Quản lý</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* SUCCESS & ERROR BANNERS */}
      {successBanner && (
        <div
          className={`border-y px-6 py-3 flex items-center justify-between text-sm transition animate-in fade-in slide-in-from-top-2 ${
            successBanner.action === "CHECK_IN"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm"
              : "bg-blue-50 border-blue-300 text-blue-900 shadow-sm"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-full ${
                successBanner.action === "CHECK_IN" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
              }`}
            >
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold tracking-wide">{successBanner.title}</span>
              <span className="mx-2 opacity-40">|</span>
              <span className="text-xs opacity-90">{successBanner.subtitle}</span>
            </div>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-gray-400 hover:text-gray-700 transition">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-amber-50 border-y border-amber-300 px-6 py-2.5 text-amber-900 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-amber-700 hover:text-amber-900">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* MAIN BODY: CHỈ CÓ KHUNG QUÉT BARCODE TẬP TRUNG */}
      <main className="flex-1 p-4 sm:p-8 flex items-center justify-center max-w-4xl mx-auto w-full">
        <section className="w-full flex flex-col items-center">
          <div className="w-full bg-white rounded-3xl border border-gray-100 p-4 sm:p-7 shadow-sm space-y-4">
            {/* CAMERA FEED & SCAN BOX */}
            <div
              className={`relative rounded-2xl overflow-hidden border bg-black shadow-inner aspect-[4/3] sm:aspect-[16/10] flex flex-col items-center justify-center transition-all duration-300 ${
                scanSuccessFlash
                  ? "border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.6)]"
                  : "border-gray-200"
              }`}
            >
              {/* CONTAINER DÀNH CHO HTML5-QRCODE ENGINE (ZXING) */}
              <div id="interactive-webcam-reader" className="w-full h-full overflow-hidden" />

              {/* GÓC NGẮM ĐỎ PASTEL & TIA LASER */}
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
                <div className="flex justify-between">
                  <div
                    className={`w-12 h-12 border-t-4 border-l-4 rounded-tl-xl transition-colors ${
                      scanSuccessFlash ? "border-emerald-400" : "border-rose-500"
                    }`}
                  />
                  <div
                    className={`w-12 h-12 border-t-4 border-r-4 rounded-tr-xl transition-colors ${
                      scanSuccessFlash ? "border-emerald-400" : "border-rose-500"
                    }`}
                  />
                </div>

                <div className="relative w-full h-24 flex items-center justify-center">
                  <div
                    className={`w-full h-0.5 shadow-[0_0_15px_2px_rgba(251,113,133,0.7)] animate-laser-sweep transition-colors ${
                      scanSuccessFlash ? "bg-emerald-400 shadow-[0_0_20px_4px_rgba(52,211,153,0.8)]" : "bg-rose-500"
                    }`}
                  />
                </div>

                <div className="flex justify-between">
                  <div
                    className={`w-12 h-12 border-b-4 border-l-4 rounded-bl-xl transition-colors ${
                      scanSuccessFlash ? "border-emerald-400" : "border-rose-500"
                    }`}
                  />
                  <div
                    className={`w-12 h-12 border-b-4 border-r-4 rounded-br-xl transition-colors ${
                      scanSuccessFlash ? "border-emerald-400" : "border-rose-500"
                    }`}
                  />
                </div>
              </div>

              {/* NHÃN TRẠNG THÁI GÓC TRÊN */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 flex items-center gap-2 text-xs font-semibold shadow-md z-10">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400">Trạm quét sẵn sàng</span>
              </div>

              {/* HƯỚNG DẪN DƯỚI KHUNG CAMERA */}
              <div className="absolute bottom-4 inset-x-4 sm:inset-x-8 bg-black/65 backdrop-blur-md py-2.5 px-4 rounded-2xl border border-white/10 text-center z-10 shadow-md">
                <div className="text-xs sm:text-sm text-white font-medium flex items-center justify-center gap-2">
                  <span>Đưa mã vạch trên thẻ sinh viên vào khung camera (hoặc dùng đầu đọc Barcode USB)</span>
                </div>
              </div>
            </div>

            {/* CHÚ THÍCH DƯỚI GỌN GÀNG */}
            <div className="text-center pt-2">
              <p className="text-xs text-gray-500">
                Hệ thống tự động ghi nhận Check-in và Check-out ca trực phòng Lab theo thời gian thực.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* POP-UP OVERLAY KẾT QUẢ QUÉT TO RÕ GIỮA MÀN HÌNH (TỰ ẨN SAU 3.5 GIÂY) */}
      {showBigOverlay && lastResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-7 max-w-sm w-full text-center space-y-4">
            <div className={`inline-flex p-4 rounded-2xl ${
              lastResult.action === "CHECK_IN" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
            }`}>
              {lastResult.action === "CHECK_IN" ? (
                <LogIn className="h-10 w-10" />
              ) : (
                <LogOut className="h-10 w-10" />
              )}
            </div>

            <div>
              <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                lastResult.action === "CHECK_IN"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}>
                {lastResult.action === "CHECK_IN" ? "ĐIỂM DANH VÀO" : "ĐIỂM DANH RA"}
              </span>
              <h2 className="text-xl font-extrabold text-gray-900 mt-2.5">{lastResult.studentName}</h2>
              <div className="text-xs font-mono text-gray-400 mt-0.5">MSSV: {lastResult.studentCode}</div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3.5 text-xs text-gray-700 font-medium">
              {lastResult.action === "CHECK_IN" ? (
                <div>Giờ vào: <strong className="text-emerald-700 font-bold">{new Date(lastResult.checkInTime).toLocaleTimeString("vi-VN")}</strong></div>
              ) : (
                <div>Thời gian có mặt: <strong className="text-rose-600 font-bold">{lastResult.durationText || "--"}</strong></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BarcodeScanStationPageView() {
  return <ScanStationContent />;
}
