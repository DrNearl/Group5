import nodemailer from "nodemailer";
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
  provider?: "WEBHOOK_HTTPS" | "RESEND_API" | "SMTP";
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

function buildQrEmailHtml(params: SendPersonalQrParams, imgSrc: string): string {
  const expiryText =
    params.expiresAtSec && params.expiresAtSec > 0
      ? new Date(params.expiresAtSec * 1000).toLocaleDateString("vi-VN")
      : "Theo thời gian phân công ca trực";

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
      <div style="background: #b91c1c; color: #ffffff; padding: 20px 24px; text-align: center;">
        <div style="font-size: 12px; letter-spacing: 1px; opacity: 0.9; text-transform: uppercase;">Trường Đại học Văn Lang • Khoa Công nghệ Thông tin</div>
        <h2 style="margin: 6px 0 0; font-size: 20px; font-weight: bold;">THẺ QR ĐIỂM DANH CÁ NHÂN</h2>
      </div>
      <div style="padding: 24px; color: #1f2937;">
        <p style="margin: 0 0 12px; font-size: 14px;">Chào <strong>${params.fullName}</strong>,</p>
        <p style="margin: 0 0 18px; font-size: 13px; color: #4b5563; line-height: 1.5;">
          Hệ thống Xưởng Thực tập Khoa CNTT cấp cho bạn Mã QR cá nhân định danh điện tử để sử dụng Check-in / Check-out tại Camera Trạm quét.
        </p>

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 18px;">
          <img src="${imgSrc}" alt="Mã QR Cá Nhân VLU" width="240" height="240" style="display: block; margin: 0 auto 12px; border-radius: 8px; border: 1px solid #e5e7eb;" />
          <div style="font-size: 15px; font-weight: bold; color: #111827;">${params.fullName}</div>
          <div style="font-size: 13px; font-family: monospace; color: #b91c1c; font-weight: bold; margin-top: 2px;">MSSV: ${params.studentCode}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
            Lớp: ${params.className || "Đang cập nhật"} • Phiên bản: <strong>v${params.qrVersion}</strong> • Hiệu lực: ${expiryText}
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
 * Gửi email chứa Mã QR cá nhân.
 * Tự động ưu tiên kênh HTTPS (443) để chạy xuyên tường lửa FITLAB Cloud,
 * hỗ trợ fallback sang SMTP truyền thống trên máy cá nhân.
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

  const subject = `[VLU CNTT] Thẻ QR Điểm Danh Cá Nhân - ${params.fullName} (${params.studentCode})`;
  const { buffer, base64Raw, dataUrl } = await generateQrImageAssets(params.qrToken);
  const filename = `VLU_QR_${params.studentCode}_v${params.qrVersion}.png`;

  // KÊNH 1: Google Apps Script / HTTP Webhook qua cổng HTTPS 443 (chạy ổn định 100% trên FITLAB)
  const webhookUrl = process.env.EMAIL_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    try {
      const html = buildQrEmailHtml(params, "cid:vlu-qr-card");
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo,
          subject,
          html,
          qrBase64: base64Raw,
          filename,
          studentCode: params.studentCode,
          fullName: params.fullName,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          sent: false,
          configured: true,
          provider: "WEBHOOK_HTTPS",
          message: `Webhook lỗi HTTP ${res.status}: ${text.slice(0, 120)}`,
        };
      }

      return {
        sent: true,
        configured: true,
        provider: "WEBHOOK_HTTPS",
        message: `Đã gửi Mã QR (v${params.qrVersion}) tới ${emailTo} qua HTTPS Webhook!`,
      };
    } catch (err: any) {
      return {
        sent: false,
        configured: true,
        provider: "WEBHOOK_HTTPS",
        message: `Lỗi kết nối Webhook gửi mail: ${err.message}`,
      };
    }
  }

  // KÊNH 2: Resend API qua cổng HTTPS 443 (chạy ổn định trên FITLAB)
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const fromEmail = process.env.RESEND_FROM || "VLU Lab <onboarding@resend.dev>";
      const html = buildQrEmailHtml(params, dataUrl);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [emailTo],
          subject,
          html,
          attachments: [
            {
              filename,
              content: base64Raw,
            },
          ],
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        return {
          sent: false,
          configured: true,
          provider: "RESEND_API",
          message: `Resend API lỗi: ${resData?.message || res.status}`,
        };
      }

      return {
        sent: true,
        configured: true,
        provider: "RESEND_API",
        message: `Đã gửi Mã QR (v${params.qrVersion}) tới ${emailTo} qua Resend!`,
      };
    } catch (err: any) {
      return {
        sent: false,
        configured: true,
        provider: "RESEND_API",
        message: `Lỗi Resend API: ${err.message}`,
      };
    }
  }

  // KÊNH 3: SMTP truyền thống (Gmail App Password trên máy local không bị chặn cổng 465/587)
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT || 465),
        secure: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) === 465 : true,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        connectionTimeout: 8000,
      });

      const html = buildQrEmailHtml(params, "cid:vlu-qr-card");
      await transporter.sendMail({
        from: `"VLU Lab Khoa CNTT" <${smtpUser}>`,
        to: emailTo,
        subject,
        html,
        attachments: [
          {
            filename,
            content: buffer,
            cid: "vlu-qr-card",
          },
          {
            filename,
            content: buffer,
          },
        ],
      });

      return {
        sent: true,
        configured: true,
        provider: "SMTP",
        message: `Đã gửi Mã QR (v${params.qrVersion}) tới ${emailTo}!`,
      };
    } catch (err: any) {
      return {
        sent: false,
        configured: true,
        provider: "SMTP",
        message: `Lỗi gửi SMTP (${err.code || err.message}). Lưu ý: Nếu đang chạy trên FITLAB, cổng SMTP 465/587 bị tường lửa chặn, hãy dùng EMAIL_WEBHOOK_URL qua HTTPS 443!`,
      };
    }
  }

  // CHƯA CẤU HÌNH KÊNH NÀO
  return {
    sent: false,
    configured: false,
    message:
      "Chưa cấu hình biến môi trường gửi Email (EMAIL_WEBHOOK_URL, RESEND_API_KEY hoặc SMTP_USER). Bạn vẫn có thể tải trực tiếp ảnh QR hoặc in A4 tại đây.",
  };
}
