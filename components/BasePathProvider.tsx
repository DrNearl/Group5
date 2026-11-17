"use client";

import { useEffect } from "react";

export default function BasePathProvider() {
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    if (basePath && typeof window !== "undefined") {
      const origFetch = window.fetch;
      window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
        if (typeof input === "string" && input.startsWith("/api/")) {
          return origFetch(basePath + input, init);
        }
        return origFetch(input, init);
      };
    }
  }, []);

  return null;
}
