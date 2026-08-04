import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Media URLs point to the host-exposed MinIO address. Let the browser load
    // them directly so standalone containers do not resolve localhost inside
    // the frontend container.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/event-media/**",
      },
    ],
  },
};

export default nextConfig;
