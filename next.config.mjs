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

  async headers() {
    return [
      {
        // Prevent direct access to /storage — belt-and-suspenders
        // (storage/ is outside public/ so Next.js won't serve it anyway)
        source: "/storage/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ]
  },
}

export default nextConfig
