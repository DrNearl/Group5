"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Upload,
  X,
  Download,
  Mail,
  Printer,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getAssetPath } from "@/lib/asset-path";

interface PreviewStudent {
  studentCode: string;
  fullName: string;
  email: string;
  phone: string;
  className: string;
  existsInDb?: boolean;
}

interface SavedQrCard {
  studentCode: string;
  fullName: string;
  className: string;
  qrVersion: number;
  qrDataUrl: string;
}

interface StudentBulkImportModalProps {
  userId?: string;
  userEmail?: string;
  username?: string;
  onClose: () => void;
  onImported: () => void;
}

export default function StudentBulkImportModal({
  userId,
  userEmail,
  username,
  onClose,
  onImported,
}: StudentBulkImportModalProps) {
  const staffHeaders: Record<string, string> = {
    ...(userId ? { "x-vlu-user-id": userId } : {}),
    ...(userEmail ? { "x-vlu-user-email": userEmail } : {}),
    ...(username ? { "x-vlu-username": username } : {}),
  };
  const [step, setStep] = useState<"UPLOAD" | "PREVIEW" | "DONE">("UPLOAD");
  const [parsing, setParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewList, setPreviewList] = useState<PreviewStudent[]>([]);
  const [ttlDays, setTtlDays] = useState<number>(90);
  const [autoSendEmail, setAutoSendEmail] = useState<boolean>(true);
  const [processing, setProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [summary, setSummary] = useState<{
    savedCount: number;
    emailedCount: number;
    emailNotice: string;
    cards: SavedQrCard[];
  } | null>(null);

  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        MSSV: "2374802010101",
        "Họ và tên": "Nguyễn Văn An",
        Lớp: "K29-CNTT1",
        Email: "an.2374802010101@vanlanguni.vn",
        "Số điện thoại": "0901234567",
      },
      {
        MSSV: "2374802010102",
        "Họ và tên": "Trần Thị Bình",
        Lớp: "K29-CNTT1",
        Email: "binh.2374802010102@vanlanguni.vn",
        "Số điện thoại": "",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachSinhVien");
    XLSX.writeFile(wb, "Mau_Danh_Sach_Sinh_Vien_VLU.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(getAssetPath("/api/students/import"), {
        method: "POST",
        headers: staffHeaders,
        body: formData,
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.students)) {
        setPreviewList(data.students);
        setStep("PREVIEW");
      } else {
        setErrorMsg(data.message || "Không thể đọc tệp danh sách.");
      }
    } catch (err: any) {
      setErrorMsg("Lỗi tải tệp: " + err.message);
    } finally {
      setParsing(false);
    }
  };

  const updateRow = (index: number, field: keyof PreviewStudent, value: string) => {
    setPreviewList((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  };

  const removeRow = (index: number) => {
    setPreviewList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleConfirmSaveAndSend = async () => {
    if (previewList.length === 0) return;
    setProcessing(true);
    setErrorMsg(null);
    setProgressPct(10);
    setProgressText(`Đang lưu ${previewList.length} sinh viên vào cơ sở dữ liệu...`);

    try {
      const saveRes = await fetch(getAssetPath("/api/students/import"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...staffHeaders,
        },
        body: JSON.stringify({ action: "save", students: previewList }),
      });
      const saveData = await saveRes.json();
      if (!saveData.success) {
        setErrorMsg(saveData.message || "Lỗi lưu danh sách sinh viên!");
        setProcessing(false);
        return;
      }

      const savedStudents: any[] = saveData.students || [];
      const cards: SavedQrCard[] = [];
      let emailedCount = 0;
      let lastNotice = "";

      for (let i = 0; i < savedStudents.length; i++) {
        const sv = savedStudents[i];
        setProgressPct(15 + Math.round(((i + 1) / savedStudents.length) * 85));
        setProgressText(
          autoSendEmail
            ? `Đang tạo & gửi Thẻ QR (${i + 1}/${savedStudents.length}): ${sv.fullName}...`
            : `Đang tạo Thẻ QR (${i + 1}/${savedStudents.length}): ${sv.fullName}...`
        );

        if (autoSendEmail) {
          const qrRes = await fetch(getAssetPath("/api/students/qr"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...staffHeaders,
            },
            body: JSON.stringify({
              studentId: sv.id,
              action: "SEND_EMAIL",
              ttlDays,
            }),
          });
          const qrData = await qrRes.json();
          if (qrData.success) {
            cards.push({
              studentCode: sv.studentCode,
              fullName: sv.fullName,
              className: sv.className || "CNTT",
              qrVersion: qrData.qrVersion || 1,
              qrDataUrl: qrData.qrDataUrl,
            });
            if (qrData.emailResult?.sent) {
              emailedCount++;
            } else if (qrData.emailResult?.message) {
              lastNotice = qrData.emailResult.message;
            }
          }
          // Giãn nhịp 300ms giữa các email để tránh bị chặn rate-limit
          if (i < savedStudents.length - 1) {
            await new Promise((r) => setTimeout(r, 300));
          }
        } else {
          const qrRes = await fetch(
            getAssetPath(`/api/students/qr?studentId=${encodeURIComponent(sv.id)}&ttlDays=${ttlDays}`),
            { headers: staffHeaders }
          );
          const qrData = await qrRes.json();
          if (qrData.success) {
            cards.push({
              studentCode: sv.studentCode,
              fullName: sv.fullName,
              className: sv.className || "CNTT",
              qrVersion: qrData.qrVersion || 1,
              qrDataUrl: qrData.qrDataUrl,
            });
          }
        }
      }

      setSummary({
        savedCount: savedStudents.length,
        emailedCount,
        emailNotice: lastNotice,
        cards,
      });
      setStep("DONE");
      onImported();
    } catch (err: any) {
      setErrorMsg("Lỗi xử lý hàng loạt: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handlePrintA4Cards = () => {
    if (!summary?.cards.length) return;
    const printWin = window.open("", "_blank", "width=900,height=700");
    if (!printWin) {
      alert("Trình duyệt đang chặn cửa sổ bật lên (Pop-up). Vui lòng cho phép mở cửa sổ in!");
      return;
    }

    const cardsHtml = summary.cards
      .map(
        (c) => `
        <div class="card">
          <div class="school">ĐẠI HỌC VĂN LANG • KHOA CNTT</div>
          <img src="${c.qrDataUrl}" alt="${c.studentCode}" />
          <div class="name">${c.fullName}</div>
          <div class="code">MSSV: ${c.studentCode}</div>
          <div class="meta">${c.className}</div>
        </div>
      `
      )
      .join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>In Thẻ QR Sinh Viên VLU</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 16px; color: #111827; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          .card { border: 1.5px dashed #cbd5e1; border-radius: 10px; padding: 12px; text-align: center; page-break-inside: avoid; }
          .school { font-size: 10px; font-weight: bold; color: #b91c1c; margin-bottom: 6px; }
          .card img { width: 150px; height: 150px; display: block; margin: 0 auto 6px; }
          .name { font-size: 12px; font-weight: bold; }
          .code { font-size: 11px; font-family: monospace; color: #b91c1c; font-weight: bold; margin-top: 2px; }
          .meta { font-size: 10px; color: #64748b; margin-top: 2px; }
          @media print { body { margin: 8mm; } }
        </style>
      </head>
      <body>
        <div class="grid">${cardsHtml}</div>
        <script>window.onload = () => { window.print(); };</script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-rose-50/50 shrink-0">
          <div className="flex items-center gap-2 text-rose-700">
            <FileSpreadsheet className="h-5 w-5" />
            <h3 className="font-bold text-sm">
              Nhập Danh Sách PDF / Excel & Cấp Phát Thẻ QR Cá Nhân
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === "UPLOAD" && (
            <div className="space-y-4">
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 hover:border-rose-400 rounded-2xl p-8 text-center transition">
                <Upload className="h-10 w-10 text-rose-500 mx-auto mb-3" />
                <div className="font-bold text-gray-800 text-sm mb-1">
                  Chọn tệp Danh sách sinh viên (.pdf, .xlsx, .xls, .csv)
                </div>
                <p className="text-gray-500 mb-4 max-w-md mx-auto leading-relaxed">
                  Hệ thống tự động nhận diện cột MSSV, Họ tên, Lớp và Email Văn Lang. Bạn sẽ được xem trước và chỉnh sửa lại trước khi lưu & gửi mã QR.
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <label className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold cursor-pointer shadow-xs transition">
                    {parsing ? "Đang phân tích tệp..." : "Chọn tệp từ máy tính"}
                    <input
                      type="file"
                      accept=".pdf,.xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      disabled={parsing}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl font-semibold flex items-center gap-1.5 transition"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-600" />
                    Tải file Excel mẫu
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "PREVIEW" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div>
                  <span className="font-bold text-gray-800">
                    Đã trích xuất {previewList.length} sinh viên
                  </span>
                  <span className="text-gray-500 ml-2">
                    (Có thể bấm trực tiếp vào ô để sửa trước khi lưu)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("UPLOAD")}
                  disabled={processing}
                  className="text-rose-600 hover:underline font-medium"
                >
                  Chọn lại tệp khác
                </button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">MSSV</th>
                      <th className="py-2 px-3">Họ và tên</th>
                      <th className="py-2 px-3">Lớp</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Trạng thái</th>
                      <th className="py-2 px-3 text-right">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewList.map((row, idx) => (
                      <tr key={`${row.studentCode}-${idx}`} className="hover:bg-rose-50/20">
                        <td className="py-1.5 px-2">
                          <input
                            value={row.studentCode}
                            onChange={(e) => updateRow(idx, "studentCode", e.target.value)}
                            className="w-28 bg-white border border-gray-200 rounded-lg px-2 py-1 font-mono"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            value={row.fullName}
                            onChange={(e) => updateRow(idx, "fullName", e.target.value)}
                            className="w-full min-w-[140px] bg-white border border-gray-200 rounded-lg px-2 py-1"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            value={row.className}
                            onChange={(e) => updateRow(idx, "className", e.target.value)}
                            className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-1"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            value={row.email}
                            onChange={(e) => updateRow(idx, "email", e.target.value)}
                            className="w-full min-w-[180px] bg-white border border-gray-200 rounded-lg px-2 py-1"
                          />
                        </td>
                        <td className="py-1.5 px-3 whitespace-nowrap">
                          {row.existsInDb ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                              Cập nhật
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                              Tạo mới
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="text-gray-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <label className="flex items-center gap-2 font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSendEmail}
                      onChange={(e) => setAutoSendEmail(e.target.checked)}
                      className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    <Mail className="h-3.5 w-3.5 text-rose-500" />
                    Tự động gửi Thẻ QR cá nhân vào Email của từng sinh viên
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Hiệu lực QR:</span>
                    <select
                      value={ttlDays}
                      onChange={(e) => setTtlDays(Number(e.target.value))}
                      className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-gray-800 font-medium"
                    >
                      <option value={90}>90 ngày (1 học kỳ)</option>
                      <option value={180}>180 ngày (1 năm)</option>
                      <option value={0}>Không hết hạn</option>
                    </select>
                  </div>
                </div>

                {processing && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-medium text-rose-700">
                      <span>{progressText}</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "DONE" && summary && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-sm">
                    Hoàn tất nhập {summary.savedCount} sinh viên & tạo {summary.cards.length} Thẻ QR!
                  </div>
                  {autoSendEmail && (
                    <div>
                      Đã gửi thành công:{" "}
                      <strong>
                        {summary.emailedCount}/{summary.savedCount}
                      </strong>{" "}
                      email.
                      {summary.emailedCount === 0 && summary.emailNotice && (
                        <div className="text-amber-700 mt-1">
                          Lưu ý cấu hình gửi mail: {summary.emailNotice} Bạn vẫn có thể bấm{" "}
                          <strong>In A4 Thẻ QR</strong> ngay bên dưới!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handlePrintA4Cards}
                  className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-semibold flex items-center gap-2 shadow-xs"
                >
                  <Printer className="h-4 w-4" />
                  In A4 toàn bộ {summary.cards.length} Thẻ QR
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex justify-end gap-2.5 shrink-0">
          {step === "PREVIEW" && (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={processing}
                className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl font-medium"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveAndSend}
                disabled={processing || previewList.length === 0}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50"
              >
                {processing
                  ? "Đang xử lý..."
                  : autoSendEmail
                  ? `Lưu & Gửi Mail (${previewList.length} SV)`
                  : `Lưu & Tạo QR (${previewList.length} SV)`}
              </button>
            </>
          )}
          {step !== "PREVIEW" && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold"
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
