// Validate environment variables as soon as `next dev` or `next build` starts,
// so a missing or malformed value fails with a clear message instead of at runtime.
import "./src/shared/config/env";
import { securityHeaders } from "./src/shared/config/security-headers";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Content-Security-Policy needs a fresh nonce per response, so src/proxy.ts sets it.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
