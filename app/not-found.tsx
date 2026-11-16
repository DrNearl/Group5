"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function NotFound() {
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/proxy/3000")) {
      window.location.replace(window.location.href.replace("/proxy/3000", "/absproxy/3000"));
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center font-sans bg-gray-50 text-gray-800">
      <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xl max-w-md w-full space-y-4">
        <div className="text-4xl font-extrabold text-red-600">VLU LAB</div>
        <h2 className="text-lg font-bold text-gray-900">Đang tự động chuyển hướng vào hệ thống...</h2>
        <p className="text-xs text-gray-500">
          Hệ thống đang tự động điều hướng sang cổng truy cập chuẩn. Nếu không tự chuyển, vui lòng bấm vào nút bên dưới:
        </p>
        <div>
          <a
            href="/absproxy/3000/"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            Vào Trạm Quét Barcode
          </a>
        </div>
      </div>
    </div>
  );
}
