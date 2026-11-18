"use client";

import React, { useState } from "react";
import { getAssetPath } from "@/lib/asset-path";

/**
 * Vector SVG Khiên đỏ Đại học Văn Lang chuẩn nhận diện
 * Hoạt động độc lập, không phụ thuộc kết nối mạng/file tĩnh, đảm bảo 100% không bao giờ bị vỡ ảnh
 */
export function VluShieldIcon({ className = "h-8 sm:h-9 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 136"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo Đại học Văn Lang"
    >
      <path
        d="M12 10C12 6.68629 14.6863 4 18 4H102C105.314 4 108 6.68629 108 10V66C108 98.5 85.5 120.5 60 132C34.5 120.5 12 98.5 12 66V10Z"
        fill="#D72134"
        stroke="#FFFFFF"
        strokeWidth="3.5"
      />
      <rect x="20" y="16" width="80" height="8" rx="2" fill="#FFFFFF" />
      <path d="M32 36L60 98L88 36H73L60 68L47 36H32Z" fill="#FFFFFF" />
      <path d="M49 36L60 56L71 36H49Z" fill="#FCA5A5" />
    </svg>
  );
}

export default function VluLogo({ className = "h-8 sm:h-9 w-auto object-contain" }: { className?: string }) {
  const [loadError, setLoadError] = useState(false);

  // Nếu file ảnh tĩnh gặp sự cố mạng hoặc server bận, tự động fallback sang SVG vector chuẩn nét tức thì
  if (loadError) {
    return <VluShieldIcon className={className} />;
  }

  return (
    <span className="inline-flex items-center select-none">
      <img
        src={getAssetPath("/vlu-logo.png")}
        alt="Logo Đại học Văn Lang"
        className={`vlu-logo-light ${className}`}
        loading="eager"
        decoding="async"
        onError={() => setLoadError(true)}
      />
      <img
        src={getAssetPath("/vlu-logo-dark.png")}
        alt="Logo Đại học Văn Lang"
        className={`vlu-logo-dark ${className}`}
        loading="eager"
        decoding="async"
        onError={() => setLoadError(true)}
      />
    </span>
  );
}
