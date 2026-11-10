/** @type {import('next').NextConfig} */
const basePath = process.env.BASE_PATH || "";

const nextConfig = {
  reactStrictMode: false, // Tắt strict mode kép để camera stream và html5-qrcode không bị mount/unmount 2 lần liên tiếp
  basePath: basePath,
  assetPrefix: basePath,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
};

export default nextConfig;
