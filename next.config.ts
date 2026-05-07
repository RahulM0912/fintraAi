import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force Next.js/Turbopack to transpile ESM-only packages in the unified
  // ecosystem so react-markdown and remark-gfm work correctly in both SSR
  // and client bundles.
  transpilePackages: [
    "react-markdown",
    "remark-gfm",
    "remark",
    "remark-parse",
    "unified",
    "vfile",
    "vfile-message",
    "unist-util-stringify-position",
    "mdast-util-gfm",
    "mdast-util-to-markdown",
    "micromark-extension-gfm",
  ],
};

export default nextConfig;
