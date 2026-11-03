"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { soundFX } from "@/lib/audio";
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
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";

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
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
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

  // Modal báo sự cố thiết bị khi quét mã EQ-
  const [equipmentModal, setEquipmentModal] = useState<EquipmentData | null>(null);
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentSeverity, setIncidentSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [incidentDesc, setIncidentDesc] = useState("");
  const [incidentSubmitting, setIncidentSubmitting] = useState(false);
  const [incidentSuccess, setIncidentSuccess] = useState<string | null>(null);

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

      // THUẬT TOÁN ĐỊNH TUYẾN: MÃ THIẾT BỊ PHÒNG LAB (EQ-)
      if (data.type === "EQUIPMENT") {
        if (isSoundEnabled) soundFX.playEquipmentChime();
        setEquipmentModal(data.data);
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

      const actionTitle = data.action === "CHECK_IN" ? "CHECK-IN THÀNH CÔNG" : "CHECK-OUT THÀNH CÔNG";
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

  // 7. Gửi Báo cáo Sự cố Thiết bị
  const handleSubmitIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentModal || !incidentTitle.trim()) return;

    setIncidentSubmitting(true);
    try {
      const res = await fetch("/api/incidents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentId: equipmentModal.id,
          studentCode: lastResult?.studentCode || "2373401010100",
          title: incidentTitle,
          severity: incidentSeverity,
          description: incidentDesc,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIncidentSuccess("Đã ghi nhận sự cố thành công! Bộ phận kỹ thuật sẽ sớm kiểm tra.");
        setTimeout(() => {
          setEquipmentModal(null);
          setIncidentSuccess(null);
          setIncidentTitle("");
          setIncidentDesc("");
        }, 2000);
      } else {
        alert("Lỗi: " + data.message);
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setIncidentSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans flex flex-col">
      <canvas ref={canvasRef} className="hidden" />

      {/* TOP HEADER (LIGHT MODE - MODERN & SCIENTIFIC) */}
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur-md px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            title="Quay lại Trang Chủ"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center shadow-sm text-white flex-shrink-0" title="Trạm quét Barcode">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              TRẠM ĐIỂM DANH BARCODE PHÒNG LAB
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 tracking-normal">
                TỰ ĐỘNG
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Quét thẻ sinh viên trước camera để Check-in / Check-out tự động
            </p>
          </div>
        </div>

        {/* PHÒNG TRỰC + NÚT ÂM THANH + ĐỒNG HỒ NAVY ĐẬM */}
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
            title={isSoundEnabled ? "Nhấn để tắt âm thanh hiệu ứng" : "Nhấn để bật âm thanh hiệu ứng"}
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

          {/* ĐỒNG HỒ XANH NAVY ĐẬM / XÁM ĐEN TƯƠNG PHẢN CAO */}
          <div className="text-right pl-3 border-l border-gray-200">
            <div className="text-2xl font-mono font-extrabold tracking-wider text-[#111827] flex items-center gap-2 justify-end">
              <Clock className="h-5 w-5 text-[#1E3A8A]" />
              {currentTime || "00:00:00"}
            </div>
            <div className="text-xs font-medium text-slate-500 capitalize">{currentDate}</div>
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

      {/* MAIN TWO-COLUMN BODY */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        {/* CỘT TRÁI (6 CỘT): CAMERA SCANNER & ĐIỀU KHIỂN TRONG THẺ TRẮNG RIÊNG BIỆT */}
        <section className="lg:col-span-6 flex flex-col">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            {/* CAMERA FEED & LASER SCAN BOX */}
            <div
              className={`relative rounded-2xl overflow-hidden border-2 bg-black shadow-md aspect-[4/3] flex flex-col items-center justify-center transition-all duration-300 ${
                scanSuccessFlash
                  ? "border-emerald-500 shadow-[0_0_35px_rgba(16,185,129,0.6)]"
                  : "border-gray-200"
              }`}
            >
              {/* CONTAINER DÀNH CHO HTML5-QRCODE ENGINE (ZXING) */}
              <div id="interactive-webcam-reader" className="w-full h-full overflow-hidden" />

              {/* TIA LASER ĐỎ CHUYỂN ĐỘNG & 4 GÓC NGẮM QUANG HỌC */}
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
                <div className="flex justify-between">
                  <div
                    className={`w-12 h-12 border-t-4 border-l-4 rounded-tl-xl transition-colors ${
                      scanSuccessFlash ? "border-emerald-400" : "border-red-500"
                    }`}
                  />
                  <div
                    className={`w-12 h-12 border-t-4 border-r-4 rounded-tr-xl transition-colors ${
                      scanSuccessFlash ? "border-emerald-400" : "border-red-500"
                    }`}
                  />
                </div>

                <div className="relative w-full h-24 flex items-center justify-center">
                  <div
                    className={`w-full h-1 shadow-[0_0_20px_4px_rgba(239,68,68,0.9)] animate-laser-sweep transition-colors ${
                      scanSuccessFlash ? "bg-emerald-400 shadow-[0_0_25px_5px_rgba(16,185,129,0.9)]" : "bg-red-500"
                    }`}
                  />
                </div>

                <div className="flex justify-between">
                  <div
                    className={`w-12 h-12 border-b-4 border-l-4 rounded-bl-xl transition-colors ${
                      scanSuccessFlash ? "border-emerald-400" : "border-red-500"
                    }`}
                  />
                  <div
                    className={`w-12 h-12 border-b-4 border-r-4 rounded-br-xl transition-colors ${
                      scanSuccessFlash ? "border-emerald-400" : "border-red-500"
                    }`}
                  />
                </div>
              </div>

              {/* TRẠNG THÁI CAMERA */}
              <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-500/40 flex items-center gap-2 text-xs font-semibold shadow-lg z-10">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-emerald-400">CAMERA QUÉT BARCODE ĐANG SẴN SÀNG</span>
              </div>

              {/* HƯỚNG DẪN ĐIỂM DANH: BANNER ĐEN XÁM MỜ (CHARCOAL) VỚI CHỮ VÀNG NHẸ */}
              <div className="absolute bottom-4 inset-x-4 bg-zinc-900/90 backdrop-blur-md p-2.5 rounded-xl border border-zinc-700/60 text-center z-10 shadow-lg">
                <div className="text-xs font-semibold text-amber-200 flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  Đưa mã vạch thẻ SV cách camera 15-25cm để nhận diện tự động
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CỘT PHẢI (6 CỘT): KẾT QUẢ QUÉT GẦN NHẤT + BẢNG LỊCH SỬ HÔM NAY */}
        <section className="lg:col-span-6 flex flex-col gap-5">
          {/* KẾT QUẢ QUÉT GẦN NHẤT */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Kết quả quét vừa thực hiện
                </h2>
              </div>
              {lastResult && (
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full uppercase flex items-center gap-1.5 ${
                    lastResult.action === "CHECK_IN"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  {lastResult.action === "CHECK_IN" ? (
                    <>
                      <LogIn className="h-3.5 w-3.5" /> ĐÃ CHECK-IN
                    </>
                  ) : (
                    <>
                      <LogOut className="h-3.5 w-3.5" /> ĐÃ CHECK-OUT
                    </>
                  )}
                </span>
              )}
            </div>

            {lastResult ? (
              <div className="flex flex-col sm:flex-row gap-5 items-center">
                {/* Snapshot Image Preview */}
                <div className="w-36 h-36 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 relative group">
                  {lastResult.snapshot ? (
                    <img
                      src={lastResult.snapshot}
                      alt="Face Snapshot"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <Camera className="h-8 w-8 mb-1" />
                      <span className="text-[10px]">No Snapshot</span>
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded">
                    Snapshot
                  </span>
                </div>

                {/* Chi tiết sinh viên */}
                <div className="flex-1 w-full space-y-2.5 text-sm">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{lastResult.studentName}</h3>
                    <div className="text-slate-500 font-mono text-xs">
                      MSSV: <span className="text-slate-800 font-bold">{lastResult.studentCode}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                      <span className="text-gray-500 block">Giờ Check-in:</span>
                      <span className="text-emerald-700 font-mono font-bold text-sm">
                        {new Date(lastResult.checkInTime).toLocaleTimeString("vi-VN")}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                      <span className="text-gray-500 block">Giờ Check-out:</span>
                      <span className="text-blue-700 font-mono font-bold text-sm">
                        {lastResult.checkOutTime
                          ? new Date(lastResult.checkOutTime).toLocaleTimeString("vi-VN")
                          : "Đang ở phòng Lab"}
                      </span>
                    </div>
                  </div>

                  {lastResult.durationText && (
                    <div className="text-xs text-blue-900 font-mono bg-blue-50 p-2.5 rounded-lg border border-blue-200 flex items-center justify-between">
                      <span className="font-semibold text-blue-700">⏱ Thời gian có mặt:</span>
                      <span className="font-bold text-blue-900 text-sm">{lastResult.durationText}</span>
                    </div>
                  )}

                  {/* BANNER THÔNG BÁO THÀNH CÔNG NỀN XANH LÁ CỰC NHẠT VỚI ICON CHECK */}
                  <div className="text-xs font-medium text-emerald-900 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>{lastResult.message}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center text-gray-400">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <UserCheck className="h-7 w-7 text-gray-400" />
                </div>
                <div className="text-sm font-semibold text-gray-700">Chưa có lượt quét nào</div>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  Đưa thẻ sinh viên vào trước camera để Check-in / Check-out tự động.
                </p>
              </div>
            )}
          </div>

          {/* BẢNG NHẬT KÝ ĐIỂM DANH VÀO - RA HÔM NAY */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex-1 flex flex-col min-h-[300px] shadow-sm">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-600" />
                Nhật ký điểm danh vào - ra hôm nay
              </h3>
              <button
                onClick={fetchStationData}
                className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1.5 transition font-medium"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Làm mới
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[340px] rounded-xl border border-gray-200 bg-white shadow-2xs">
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
                          <div className="text-[11px] text-slate-500 font-mono font-medium">{log.studentCode}</div>
                        </td>
                        <td className="py-3.5 px-4 text-emerald-700 font-bold text-xs">
                          {log.checkInTime
                            ? new Date(log.checkInTime).toLocaleTimeString("vi-VN")
                            : "--:--"}
                        </td>
                        <td className="py-3.5 px-4 text-blue-700 font-bold text-xs">
                          {log.checkOutTime
                            ? new Date(log.checkOutTime).toLocaleTimeString("vi-VN")
                            : <span className="text-slate-500 font-normal">Đang trong Lab</span>}
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
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Đang có mặt
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-gray-400 font-sans">
                        Chưa có sinh viên nào check-in hôm nay
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* MODAL BÁO CÁO SỰ CỐ THIẾT BỊ PHÒNG LAB KHI QUÉT MÃ EQ- */}
      {equipmentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setEquipmentModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <XCircle className="h-6 w-6" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <Laptop className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">THIẾT BỊ PHÒNG LAB ĐƯỢC NHẬN DIỆN</h3>
                <p className="text-xs text-amber-700 font-mono font-semibold">
                  Mã vạch: {equipmentModal.equipmentBarcode}
                </p>
              </div>
            </div>

            {incidentSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {incidentSuccess}
              </div>
            )}

            <div className="space-y-3 text-xs mb-5">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-500 block">Tên thiết bị:</span>
                  <span className="font-bold text-gray-900">{equipmentModal.equipmentName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Vị trí:</span>
                  <span className="font-semibold text-gray-800">
                    {equipmentModal.labName} ({equipmentModal.building})
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Loại máy:</span>
                  <span className="font-semibold text-gray-800">{equipmentModal.category}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Trạng thái hiện tại:</span>
                  <span
                    className={`font-bold ${
                      equipmentModal.status === "GOOD"
                        ? "text-emerald-700"
                        : equipmentModal.status === "BROKEN"
                        ? "text-rose-700"
                        : "text-amber-700"
                    }`}
                  >
                    ● {equipmentModal.status}
                  </span>
                </div>
              </div>

              {equipmentModal.specifications && (
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-[11px]">
                  <span className="text-gray-500 block font-semibold">Cấu hình phần cứng:</span>
                  <span className="text-gray-700">{equipmentModal.specifications}</span>
                </div>
              )}
            </div>

            {/* FORM BÁO HỎNG NHANH */}
            <form onSubmit={handleSubmitIncident} className="space-y-3">
              <div className="font-bold text-xs text-gray-900 uppercase flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Báo cáo sự cố cho máy này:
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1">Mô tả tóm tắt sự cố *</label>
                <input
                  type="text"
                  required
                  value={incidentTitle}
                  onChange={(e) => setIncidentTitle(e.target.value)}
                  placeholder="VD: Không lên nguồn, màn hình sọc, kẹt phím..."
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Mức độ nghiêm trọng</label>
                  <select
                    value={incidentSeverity}
                    onChange={(e: any) => setIncidentSeverity(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500"
                  >
                    <option value="LOW">Thấp (Chờ được)</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HIGH">Cao (Cần gấp)</option>
                    <option value="CRITICAL">Khẩn cấp</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Người báo cáo (MSSV)</label>
                  <input
                    type="text"
                    disabled
                    value={lastResult?.studentCode || "2373401010100"}
                    className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1">Chi tiết thêm (tùy chọn)</label>
                <textarea
                  rows={2}
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  placeholder="Ghi chú thêm về hiện tượng lỗi..."
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEquipmentModal(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={incidentSubmitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20 disabled:opacity-50"
                >
                  <Zap className="h-3.5 w-3.5" />
                  {incidentSubmitting ? "Đang gửi..." : "Gửi phiếu báo sự cố"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BarcodeScanStationPageView() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "LECTURER", "STATION", "STUDENT"]}>
      <ScanStationContent />
    </ProtectedRoute>
  );
}
