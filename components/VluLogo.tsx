"use client";

import React from "react";
import { getAssetPath } from "@/lib/asset-path";

export default function VluLogo({ className = "h-8 sm:h-9 w-auto object-contain" }: { className?: string }) {
  return (
    <>
      <img
        src={getAssetPath("/vlu-logo.png")}
        alt="Logo Đại học Văn Lang"
        className={`vlu-logo-light ${className}`}
      />
      <img
        src={getAssetPath("/vlu-logo-dark.png")}
        alt="Logo Đại học Văn Lang"
        className={`vlu-logo-dark ${className}`}
      />
    </>
  );
}
