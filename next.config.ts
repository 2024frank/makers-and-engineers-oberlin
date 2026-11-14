import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {},
  webpack(config, { dev }) {
    // Keep local iteration usable on storage-constrained machines.
    if (dev) config.cache = false
    return config
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' }
    ],
    // AVIF first: noticeably smaller than WebP for these photographic backgrounds.
    formats: ['image/avif', 'image/webp'],
    // Support up to true 4K displays and high-quality photographic renders.
    deviceSizes: [640, 828, 1080, 1440, 1920, 2560, 3840],
    imageSizes: [96, 256, 420],
    qualities: [72, 75, 92],
    minimumCacheTTL: 60 * 60 * 24 * 30
  }
}

export default nextConfig
