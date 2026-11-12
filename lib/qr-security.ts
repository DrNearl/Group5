import crypto from "crypto";

const QR_SECRET = process.env.QR_JWT_SECRET || "vlu_lab_dynamic_qr_secret_key_2026";
const DEFAULT_TTL_SECONDS = 30; // Chuẩn TOTP 30 giây bảo mật cao và đủ thời gian cho SV bấm xác nhận

export interface QrTokenPayload {
  labCode: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Sinh chuỗi Token mã QR động có gắn chữ ký số HMAC-SHA256
 */
export function generateQrSessionToken(
  labCode: string = "LAB-A518",
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): { token: string; payload: QrTokenPayload } {
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;
  const sessionId = crypto.randomBytes(8).toString("hex");

  const payload: QrTokenPayload = {
    labCode,
    sessionId,
    issuedAt: now,
    expiresAt,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", QR_SECRET)
    .update(payloadBase64)
    .digest("base64url");

  const token = `${payloadBase64}.${signature}`;
  return { token, payload };
}

/**
 * Xác thực chuỗi Token mã QR động
 * - Kiểm tra tính toàn vẹn chữ ký HMAC
 * - Kiểm tra thời hạn hiệu lực (TTL)
 */
export function verifyQrSessionToken(token: string): {
  valid: boolean;
  payload?: QrTokenPayload;
  error?: string;
} {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Token không tồn tại hoặc sai định dạng!" };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Định dạng mã QR không hợp lệ!" };
  }

  const [payloadBase64, signature] = parts;

  // 1. Kiểm tra chữ ký HMAC
  const expectedSignature = crypto
    .createHmac("sha256", QR_SECRET)
    .update(payloadBase64)
    .digest("base64url");

  // So sánh an toàn chống timing attack
  const isSignatureValid =
    signature.length === expectedSignature.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

  if (!isSignatureValid) {
    return { valid: false, error: "Chữ ký bảo mật mã QR không hợp lệ hoặc đã bị can thiệp!" };
  }

  // 2. Giải mã Payload
  let payload: QrTokenPayload;
  try {
    const jsonString = Buffer.from(payloadBase64, "base64url").toString("utf8");
    payload = JSON.parse(jsonString);
  } catch (err) {
    return { valid: false, error: "Dữ liệu payload của mã QR bị hỏng!" };
  }

  // 3. Kiểm tra thời hạn hiệu lực (cho phép dung sai mạng 3 giây)
  const now = Date.now();
  const clockSkewToleranceMs = 3000;

  if (now > payload.expiresAt + clockSkewToleranceMs) {
    const expiredSecondsAgo = Math.round((now - payload.expiresAt) / 1000);
    return {
      valid: false,
      error: `Mã QR đã hết hạn cách đây ${expiredSecondsAgo} giây! Vui lòng quét lại mã QR mới trên màn hình phòng Lab.`,
    };
  }

  return { valid: true, payload };
}

// =========================================================================
// MÃ QR CÁ NHÂN CHỐNG GIAN LẬN (HMAC-SHA256 + PHIÊN BẢN + HẠN DÙNG)
// Định dạng gọn nhẹ giúp Webcam bắt nét cực nhanh:
// VLUQR:<studentCode>.<qrVersion>.<expEpochSec>.<hmac16>
// =========================================================================

const PERSONAL_QR_SECRET =
  process.env.QR_JWT_SECRET ||
  process.env.JWT_SECRET ||
  "vlu_lab_personal_qr_hmac_secret_2026";

export interface PersonalQrPayload {
  studentCode: string;
  qrVersion: number;
  expiresAtSec: number; // 0 = không giới hạn thời gian
}

/**
 * Sinh chuỗi Mã QR cá nhân có chữ ký số chống giả mạo
 */
export function generatePersonalQrToken(
  studentCode: string,
  qrVersion: number = 1,
  ttlDays: number = 0
): { token: string; expiresAtSec: number } {
  const cleanCode = studentCode.trim();
  const expSec = ttlDays > 0 ? Math.floor(Date.now() / 1000) + ttlDays * 86400 : 0;
  const dataToSign = `${cleanCode}.${qrVersion}.${expSec}`;

  const signature = crypto
    .createHmac("sha256", PERSONAL_QR_SECRET)
    .update(dataToSign)
    .digest("hex")
    .slice(0, 16);

  return {
    token: `VLUQR:${dataToSign}.${signature}`,
    expiresAtSec: expSec,
  };
}

/**
 * Xác thực Mã QR cá nhân tại Trạm Quét Camera
 */
export function verifyPersonalQrToken(qrText: string): {
  valid: boolean;
  payload?: PersonalQrPayload;
  error?: string;
} {
  const raw = (qrText || "").trim();
  if (!raw.startsWith("VLUQR:")) {
    return { valid: false, error: "Không phải định dạng Thẻ QR Cá Nhân VLU!" };
  }

  const body = raw.slice(6); // Bỏ "VLUQR:"
  const parts = body.split(".");
  if (parts.length !== 4) {
    return { valid: false, error: "Cấu trúc Mã QR Cá Nhân không hợp lệ!" };
  }

  const [studentCode, verStr, expStr, sig] = parts;
  const qrVersion = Number(verStr);
  const expiresAtSec = Number(expStr);

  if (!studentCode || !Number.isInteger(qrVersion) || qrVersion < 1 || !Number.isFinite(expiresAtSec)) {
    return { valid: false, error: "Dữ liệu Mã QR Cá Nhân bị sai định dạng!" };
  }

  // 1. Kiểm tra chữ ký số HMAC chống tự tạo mã giả
  const dataToSign = `${studentCode}.${qrVersion}.${expiresAtSec}`;
  const expectedSig = crypto
    .createHmac("sha256", PERSONAL_QR_SECRET)
    .update(dataToSign)
    .digest("hex")
    .slice(0, 16);

  if (
    sig.length !== expectedSig.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
  ) {
    return {
      valid: false,
      error: "CẢNH BÁO: Mã QR không hợp lệ hoặc bị làm giả (Chữ ký bảo mật không khớp)!",
    };
  }

  // 2. Kiểm tra hạn sử dụng nếu có đặt hạn đợt thực tập
  const nowSec = Math.floor(Date.now() / 1000);
  if (expiresAtSec > 0 && nowSec > expiresAtSec) {
    return {
      valid: false,
      error: "Mã QR Cá Nhân này đã hết hạn sử dụng theo đợt thực tập! Vui lòng liên hệ Giảng viên cấp lại.",
    };
  }

  return {
    valid: true,
    payload: {
      studentCode,
      qrVersion,
      expiresAtSec,
    },
  };
}
