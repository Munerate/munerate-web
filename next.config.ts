import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Subdomain surfaces (tele., re., pre., …) are a documented later step —
  // see docs/SUBDOMAINS.md. Nothing here yet on purpose.
};

export default nextConfig;
