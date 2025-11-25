/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bakedbot.ai',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
       {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      }
    ],
  },
  experimental: {
    // This is already here, which is great.
    outputFileTracingExcludes: {
      '*': [
        './e2e/**/*',
      ],
    },
    // Adding this flag to help ensure Server Actions are correctly bundled.
    serverActions: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
