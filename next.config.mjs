/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for instrumentation.ts (DB init on startup)
  experimental: {
    instrumentationHook: true,
  },

  // External packages that must stay server-side only
  serverExternalPackages: ["@libsql/client", "@neondatabase/serverless"],

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
