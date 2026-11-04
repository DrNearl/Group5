"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export type UserRole = "ADMIN" | "LECTURER";

export interface AuthUser {
  id: string;
  username?: string;
  studentCode?: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>;
  quickLogin: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Các tài khoản demo tạo sẵn để người dùng test nhanh chuyển đổi quyền
type DemoAccount = { identifier: string; label: string; subLabel: string; role: UserRole };

export const DEMO_ACCOUNTS: Partial<Record<UserRole, DemoAccount>> = {
  ADMIN: {
    identifier: "chau.lth@vlu.edu.vn",
    label: "Quản trị viên (Admin)",
    subLabel: "ThS. Lý Thị Huyền Châu (chau.lth)",
    role: "ADMIN" as UserRole,
  },
  LECTURER: {
    identifier: "minhanh.gv@vlu.edu.vn",
    label: "Giảng viên",
    subLabel: "ThS. Nguyễn Minh Anh (minhanh.gv)",
    role: "LECTURER",
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // Khôi phục phiên đăng nhập từ localStorage khi khởi động
  useEffect(() => {
    try {
      const stored = localStorage.getItem("vlu_auth_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.role === "ADMIN" || parsed.role === "LECTURER")) {
          setUser(parsed);
        } else {
          // Xóa session sinh viên cũ để tránh lỗi tương thích
          localStorage.removeItem("vlu_auth_user");
          setUser(null);
        }
      }
    } catch (e) {
      console.error("Lỗi đọc session lưu trữ:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = await res.json();
      if (!data.success) {
        return { success: false, message: data.message || "Đăng nhập thất bại!" };
      }

      setUser(data.user);
      localStorage.setItem("vlu_auth_user", JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, message: "Không thể kết nối máy chủ: " + err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (targetRole: UserRole) => {
    const demo = DEMO_ACCOUNTS[targetRole];
    if (demo) {
      const res = await login(demo.identifier, "123456");
      if (res.success) {
        router.push("/");
      }
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
    } finally {
      setUser(null);
      localStorage.removeItem("vlu_auth_user");
      router.push("/login");
    }
  };

  const hasRole = useCallback(
    (allowedRoles: UserRole[]) => {
      if (!user) return false;
      return allowedRoles.includes(user.role);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isLoading,
        login,
        quickLogin,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được sử dụng bên trong AuthProvider");
  }
  return context;
}
