import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  // async rewrites() {
  //   if (process.env.NODE_ENV === "development") {
  //     return [
  //       {
  //         source: "/api/:path*",
  //         destination: `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_URL}/api/:path*`,
  //       },
  //     ];
  //   }

  //   // Production rewrites
  //   return [
  //     {
  //       source: "/api/:path*",
  //       destination: `${process.env.NEXT_PUBLIC_PROD_BACKEND_URL}/api/:path*`,
  //     },
  //   ];
  // },
};

export default nextConfig;
