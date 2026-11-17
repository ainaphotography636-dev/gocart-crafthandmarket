/**
 * CommonJS mirror of next.config.mjs for tooling that looks for next.config.js.
 * Next.js prefers next.config.mjs when both exist — keep these in sync.
 *
 * Cross-Origin-Opener-Policy + Cross-Origin-Embedder-Policy enable
 * SharedArrayBuffer for ffmpeg.wasm video compression.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  async headers() {
    return [
      {
        // credentialless still enables crossOriginIsolated / SharedArrayBuffer
        // while allowing cross-origin R2 images that lack CORP headers.
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
      {
        source: "/ffmpeg/:path*",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ]
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    }
    return config
  },
}

module.exports = nextConfig
