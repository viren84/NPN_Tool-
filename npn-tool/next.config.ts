import type { NextConfig } from "next";

/**
 * Backend pivot (2026-04-21): Next.js owns the UI, Python FastAPI owns
 * /api/*. Requests to /api/* are proxied to http://127.0.0.1:8765 where
 * the Python build is listening (see ../npn-tool-py).
 *
 * Override the target with PYTHON_API_BASE if needed (e.g. for a
 * server-deployed Python backend).
 */
const PYTHON_API_BASE = process.env.PYTHON_API_BASE ?? "http://127.0.0.1:8765";

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    // beforeFiles: runs BEFORE file-based routing so legacy /api/**/route.ts
    // handlers don't win. Proxy takes precedence.
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${PYTHON_API_BASE}/api/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
