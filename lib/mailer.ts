import QRCode from "qrcode";

export interface SendPersonalQrParams {
  to: string;
  fullName: string;
  studentCode: string;
  className?: string | null;
  qrToken: string;
  qrVersion: number;
  expiresAtSec?: number;
}

export interface SendEmailResult {
  sent: boolean;
  configured: boolean;
  provider?: "BREVO_API";
  message: string;
}

/**
 * Sinh ảnh QR PNG (Buffer & DataURL) độ nét cao từ chuỗi token đã ký
 */
export async function generateQrImageAssets(qrToken: string): Promise<{
  buffer: Buffer;
  base64Raw: string;
  dataUrl: string;
}> {
  const buffer = await QRCode.toBuffer(qrToken, {
    type: "png",
    width: 420,
    margin: 3,
    errorCorrectionLevel: "M",
    color: {
      dark: "#111827",
      light: "#FFFFFF",
    },
  });

  const base64Raw = buffer.toString("base64");
  const dataUrl = `data:image/png;base64,${base64Raw}`;
  return { buffer, base64Raw, dataUrl };
}

/**
 * Dựng mã QR bằng bảng HTML nhỏ để hiển thị sắc nét ngay trong Outlook Web / Gmail
 * mà không bị trình duyệt mail chặn như ảnh base64 data URL.
 */
function buildHtmlQrTable(qrToken: string): string {
  const qr = QRCode.create(qrToken, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const rows: string[] = [];

  for (let r = 0; r < size; r++) {
    const cells: string[] = [];
    for (let c = 0; c < size; c++) {
      const dark = qr.modules.get(r, c);
      const color = dark ? "#000000" : "#ffffff";
      cells.push(
        `<td bgcolor="${color}" style="width:6px;height:6px;padding:0;margin:0;background-color:${color};background-image:linear-gradient(${color},${color});"></td>`
      );
    }
    rows.push(`<tr>${cells.join("")}</tr>`);
  }

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="margin:0 auto 12px;border-collapse:collapse;background-color:#ffffff;background-image:linear-gradient(#ffffff,#ffffff);border-radius:10px;color-scheme:light only;"><tbody><tr><td bgcolor="#ffffff" style="padding:14px;background-color:#ffffff;background-image:linear-gradient(#ffffff,#ffffff);border-radius:10px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody>${rows.join("")}</tbody></table></td></tr></tbody></table>`;
}

function buildQrEmailHtml(params: SendPersonalQrParams): string {
  const expiryText =
    params.expiresAtSec && params.expiresAtSec > 0
      ? new Date(params.expiresAtSec * 1000).toLocaleDateString("vi-VN")
      : "Theo thời gian phân công ca trực";

  const qrTableHtml = buildHtmlQrTable(params.qrToken);

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
      <div style="background: #b91c1c; color: #ffffff; padding: 20px 24px; text-align: center;">
        <div style="font-size: 12px; letter-spacing: 1px; opacity: 0.9; text-transform: uppercase;">Trường Đại học Văn Lang • Khoa Công nghệ Thông tin</div>
        <h2 style="margin: 6px 0 0; font-size: 20px; font-weight: bold;">THẺ QR ĐIỂM DANH CÁ NHÂN</h2>
      </div>
      <div style="padding: 24px; color: #1f2937;">
        <p style="margin: 0 0 12px; font-size: 14px;">Chào <strong>${params.fullName}</strong>,</p>
        <p style="margin: 0 0 18px; font-size: 13px; color: #4b5563; line-height: 1.5;">
          Hệ thống Xưởng Thực tập Khoa CNTT cấp cho bạn Mã QR cá nhân định danh điện tử để sử dụng Check-in / Check-out tại Camera Trạm quét (hoặc lưu tệp ảnh PNG đính kèm trong email về điện thoại).
        </p>

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 18px;">
          ${qrTableHtml}
          <div style="font-size: 15px; font-weight: bold; color: #111827;">${params.fullName}</div>
          <div style="font-size: 13px; font-family: monospace; color: #b91c1c; font-weight: bold; margin-top: 2px;">MSSV: ${params.studentCode}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
            Lớp: ${params.className || "Đang cập nhật"} • Hiệu lực: ${expiryText}
          </div>
          <div style="font-size: 11px; color: #9ca3af; margin-top: 6px;">
            Mẹo: Nếu bật Chế độ tối (Dark Mode), hãy mở tệp ảnh PNG đính kèm để quét nhạy nhất.
          </div>
        </div>

        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 14px; border-radius: 6px; font-size: 12px; color: #7f1d1d; line-height: 1.5;">
          <strong>Lưu ý chống gian lận:</strong> Mã QR có gắn chữ ký bảo mật cá nhân. Vui lòng <strong>không chia sẻ ảnh QR cho người khác</strong>. Trạm quét sẽ tự động chụp ảnh khuôn mặt đối chiếu mỗi lần điểm danh; nếu bị lộ mã, hãy báo Giảng viên để vô hiệu hóa mã cũ và cấp lại mã mới.
        </div>
      </div>
      <div style="background: #f3f4f6; padding: 12px 24px; text-align: center; font-size: 11px; color: #6b7280;">
        VLU Lab Attendance System • Khoa Công nghệ Thông tin
      </div>
    </div>
  `;
}

/**
 * Gửi email chứa Mã QR cá nhân qua Brevo HTTP API v3 (cổng HTTPS 443, chạy ổn định trên FITLAB).
 */
export async function sendPersonalQrEmail(params: SendPersonalQrParams): Promise<SendEmailResult> {
  const emailTo = (params.to || "").trim();
  if (!emailTo || !emailTo.includes("@")) {
    return {
      sent: false,
      configured: true,
      message: "Địa chỉ Email sinh viên không hợp lệ!",
    };
  }

  const brevoKey = process.env.BREVO_API_KEY?.trim();
  const brevoSender = process.env.BREVO_SENDER_EMAIL?.trim();
  if (!brevoKey || !brevoSender || !brevoSender.includes("@")) {
    return {
      sent: false,
      configured: false,
      message:
        "Chưa cấu hình BREVO_API_KEY và BREVO_SENDER_EMAIL trong file .env. Bạn vẫn có thể tải ảnh PNG hoặc in A4 tại đây.",
    };
  }

  const subject = `[VLU CNTT] Thẻ QR Điểm Danh Cá Nhân - ${params.fullName} (${params.studentCode})`;
  const filename = `VLU_QR_${params.studentCode}.png`;
  const { base64Raw } = await generateQrImageAssets(params.qrToken);
  const htmlContent = buildQrEmailHtml(params);

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "VLU Lab Khoa CNTT", email: brevoSender },
        to: [{ email: emailTo, name: params.fullName }],
        subject,
        htmlContent,
        attachment: [{ name: filename, content: base64Raw }],
      }),
    });

    const resData = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        sent: false,
        configured: true,
        provider: "BREVO_API",
        message: `Brevo API lỗi (${res.status}): ${resData?.message || "Kiểm tra lại BREVO_API_KEY / BREVO_SENDER_EMAIL"}`,
      };
    }

    return {
      sent: true,
      configured: true,
      provider: "BREVO_API",
      message: `Đã gửi Mã QR tới ${emailTo} qua Brevo!`,
    };
  } catch (err: any) {
    return {
      sent: false,
      configured: true,
      provider: "BREVO_API",
      message: `Lỗi kết nối Brevo API: ${err.message}`,
    };
  }
}
