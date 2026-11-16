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
    let sessionUsername: string | null = null;
    let sessionEmail: string | null = null;
    const rawCookie = req.cookies.get("vlu_user_session")?.value;

    if (rawCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(rawCookie));
        if (parsed?.id) userId = String(parsed.id).trim();
        if (parsed?.username) sessionUsername = String(parsed.username).trim().toLowerCase();
        if (parsed?.email) sessionEmail = String(parsed.email).trim().toLowerCase();
      } catch {
        // Bỏ qua nếu cookie lỗi định dạng để kiểm tra tiếp header
      }
    }

    if (!userId) {
      const headerId = req.headers.get("x-vlu-user-id");
      if (headerId) userId = headerId.trim();
    }
    if (!sessionUsername) {
      const headerUsername = req.headers.get("x-vlu-username");
      if (headerUsername) sessionUsername = headerUsername.trim().toLowerCase();
    }
    if (!sessionEmail) {
      const headerEmail = req.headers.get("x-vlu-user-email");
      if (headerEmail) sessionEmail = headerEmail.trim().toLowerCase();
    }

    if (!userId && !sessionUsername && !sessionEmail) {
      return {
        authorized: false,
        status: 401,
        message: "Chưa đăng nhập! Chỉ Admin hoặc Giảng viên mới có quyền thực hiện thao tác này.",
      };
    }

    const selectFields = {
      id: true,
      username: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
    };

    let dbUser = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: selectFields })
      : null;

    // Fallback theo username/email trong trường hợp DB vừa reset/seed lại làm đổi UUID của session cũ
    if (!dbUser && (sessionUsername || sessionEmail)) {
      const orFilters: Array<{ username?: string; email?: string }> = [];
      if (sessionUsername) orFilters.push({ username: sessionUsername });
      if (sessionEmail) orFilters.push({ email: sessionEmail });

      dbUser = await prisma.user.findFirst({
        where: { OR: orFilters },
        select: selectFields,
      });
    }

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
