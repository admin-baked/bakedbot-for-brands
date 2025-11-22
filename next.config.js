/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "minoritycannabis.org",
      },
      {
        protocol: "https",
        hostname: "bakedbot.ai",
      },
    ],
  },
};

// Invalidate cache and trigger a rebuild.
module.exports = nextConfig;
