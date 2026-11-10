import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import AppShell from "@/components/AppShell";
import BasePathProvider from "@/components/BasePathProvider";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "VLU Lab Barcode System | Quản lý & Điểm danh trực phòng LAB Khoa CNTT",
  description:
    "Hệ thống quản lý và điểm danh trực phòng LAB Khoa CNTT bằng Barcode & Mã QR - Trường Đại học Văn Lang",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <BasePathProvider />
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
