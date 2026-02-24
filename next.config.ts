import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/Fitna',
  assetPrefix: '/Fitna/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
