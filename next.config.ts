import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The web app is deployed under /app on the public domain.
  // The marketing site (Nodality) lives at / and rewrites /app/* to this
  // Next.js deployment. Setting basePath makes Next.js prefix every
  // internal link, asset URL, and API route automatically.
  basePath: "/app",
  // Baked at build time — surfaced on the login screen so we can tell at a
  // glance which deploy is live. `next.config.ts` evaluates once per build,
  // so `new Date()` here freezes to the build's moment.
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  images: {
    localPatterns: [
      {
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
