
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'studio-567050101-bc6e8.firebasestorage.app',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  // Disable the default service worker generation to gain more control
  // and prevent aggressive caching issues that lead to stale configurations.
  workboxOpts: {
    swDest: 'public/sw.js',
    disable: process.env.NODE_ENV === 'development',
    // Other configurations can be added here if a more complex PWA is needed later.
  },
};

module.exports = nextConfig;
