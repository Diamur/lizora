import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "bcryptjs"],

  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
