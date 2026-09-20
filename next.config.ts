import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Overridable so the test suite can build into its own directory. Next
  // allows only one dev server per build directory, and without this you
  // could not run `npm test` while your own dev server was running.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: ["@getalby/sdk"],
  turbopack: {
    root,
  },
};

export default nextConfig;
