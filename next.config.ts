import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
        search: "",
      },
    ],
  },
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
};

export default nextConfig;
