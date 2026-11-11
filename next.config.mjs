/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Keep CI builds deterministic even if ESLint plugins drift on Vercel.
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
