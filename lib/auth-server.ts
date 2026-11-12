import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export interface AuthorizedUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
}

/**
 * Xác thực quyền Admin hoặc Giảng viên trên Backend API.
 * Kiểm tra cookie phiên đăng nhập và đối chiếu trực tiếp với bảng User trong CSDL
 * để chống giả mạo cookie từ trình duyệt.
 */
export async function requireStaffAuth(req: NextRequest): Promise<
  | { authorized: true; user: AuthorizedUser }
  | { authorized: false; status: number; message: string }
> {
  try {
    let userId: string | null = null;
    const rawCookie = req.cookies.get("vlu_user_session")?.value;

    if (rawCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(rawCookie));
        if (parsed?.id) userId = String(parsed.id);
      } catch {
        // Bỏ qua nếu cookie lỗi định dạng để kiểm tra tiếp header
      }
    }

    if (!userId) {
      const headerId = req.headers.get("x-vlu-user-id");
      if (headerId) userId = headerId.trim();
    }

    if (!userId) {
      return {
        authorized: false,
        status: 401,
        message: "Chưa đăng nhập! Chỉ Admin hoặc Giảng viên mới có quyền thực hiện thao tác này.",
      };
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!dbUser || !dbUser.isActive) {
      return {
        authorized: false,
        status: 403,
        message: "Tài khoản không tồn tại hoặc đã bị vô hiệu hóa!",
      };
    }

    if (dbUser.role !== "ADMIN" && dbUser.role !== "LECTURER") {
      return {
        authorized: false,
        status: 403,
        message: "Không đủ quyền! Chỉ Quản trị viên hoặc Giảng viên mới được phép cấp phát QR.",
      };
    }

    return {
      authorized: true,
      user: {
        id: dbUser.id,
        username: dbUser.username,
        fullName: dbUser.fullName,
        email: dbUser.email,
        role: dbUser.role,
      },
    };
  } catch (error: any) {
    return {
      authorized: false,
      status: 500,
      message: "Lỗi xác thực quyền: " + (error?.message || "Server Error"),
    };
  }
}
