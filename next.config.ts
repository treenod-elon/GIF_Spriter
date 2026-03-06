import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
  serverExternalPackages: ['@ffmpeg-installer/ffmpeg', '@ffprobe-installer/ffprobe', 'fluent-ffmpeg'],
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;
