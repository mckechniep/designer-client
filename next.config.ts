import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["src/lib/generation/font-assets/**/*"],
  },
};

export default nextConfig;
