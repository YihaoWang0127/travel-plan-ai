import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack ignores stray lockfiles higher up.
  turbopack: {
    root: __dirname,
  },
  // Hide the dev-mode route indicator badge (bottom-left "N" button).
  devIndicators: false,
};

export default nextConfig;
