/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for instrumentation.ts (DB init on startup)
  experimental: {
    instrumentationHook: true,
  },

  // Increase body size limit for video uploads (2 GB)
  serverExternalPackages: ["better-sqlite3"],

  images: {
    unoptimized: true,
  },

  // Hide the dev overlay indicator (the floating button bottom-left)
  devIndicators: false,

  async headers() {
    return [
      {
        source: "/storage/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ]
  },
}

export default nextConfig
