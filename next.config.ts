import type { NextConfig } from "next";

// Validate environment variables as soon as `next dev` or `next build` starts,
// so a missing or malformed value fails with a clear message instead of at runtime.
import "./src/shared/config/env";

const nextConfig: NextConfig = {};

export default nextConfig;
