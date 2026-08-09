import type { NextConfig } from "next";

const storageUrl = process.env.NEXT_PUBLIC_STORAGE_URL;
const storage = storageUrl ? new URL(storageUrl) : undefined;

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Media URLs point to the host-exposed MinIO address. Let the browser load
    // them directly so standalone containers do not resolve localhost inside
    // the frontend container.
    unoptimized: true,
    remotePatterns: [
      ...(storage ? [{
        protocol: storage.protocol.replace(":", "") as "http" | "https",
        hostname: storage.hostname,
        port: storage.port,
        pathname: "/event-media/**",
      }] : [{
        protocol: "http" as const,
        hostname: "localhost",
        port: "9000",
        pathname: "/event-media/**",
      }]),
    ],
  },
};

export default nextConfig;
