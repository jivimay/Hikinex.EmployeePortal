import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Netlify serves this app under the main website's /portal path.
  // Leave local development and the existing Sites configuration at the root.
  basePath: process.env.PORTAL_BASE_PATH || "",
};

export default nextConfig;
