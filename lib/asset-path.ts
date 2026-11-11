/**
 * Trợ giúp tạo đường dẫn tài nguyên tĩnh (assets) tương thích với cả localhost
 * và reverse proxy trên iDragonCloud FITLAB (/absproxy/3000 hoặc /proxy/3000).
 */
export function getAssetPath(path: string): string {
  if (typeof window !== "undefined") {
    // Tự động nhận diện prefix proxy trên iDragonCloud nếu có
    const match = window.location.pathname.match(/^(\/(?:abs)?proxy\/\d+)/);
    if (match) {
      const prefix = match[1];
      const cleanPath = path.startsWith("/") ? path : `/${path}`;
      return `${prefix}${cleanPath}`;
    }
  }
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
}
