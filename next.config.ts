import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The web app is deployed under /app on the public domain.
  // The marketing site (Nodality) lives at / and rewrites /app/* to this
  // Next.js deployment. Setting basePath makes Next.js prefix every
  // internal link, asset URL, and API route automatically.
  basePath: "/app",
  images: {
    localPatterns: [
      {
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
