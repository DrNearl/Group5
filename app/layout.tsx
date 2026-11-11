import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import AppShell from "@/components/AppShell";

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (window.location.pathname.startsWith('/proxy/3000')) {
                    window.location.replace(window.location.href.replace('/proxy/3000', '/absproxy/3000'));
                    return;
                  }
                  var origFetch = window.fetch;
                  window.fetch = function(input, init) {
                    if (typeof input === 'string' && input.indexOf('/api/') === 0) {
                      var match = window.location.pathname.match(/^(\\\\/(?:abs)?proxy\\\\/\\\\d+)/);
                      if (match) {
                        input = match[1] + input;
                      }
                    }
                    return origFetch.call(this, input, init);
                  };
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
