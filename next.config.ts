import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root: the outer executive-assistant repo (a separate,
  // unrelated Node project) has its own package-lock.json above this directory,
  // which Turbopack would otherwise try to treat as the monorepo root.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
