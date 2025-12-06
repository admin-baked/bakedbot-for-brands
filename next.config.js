/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.bakedbot.ai',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.cloud.google.com',
      },
      {
        protocol: 'https',
        hostname: 'product-assets.iheartjane.com',
      },
      {
        protocol: 'https',
        hostname: 's3-us-west-2.amazonaws.com',
      },
    ],
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';

    return [
      // Security headers for all routes
      {
        source: '/(.*)',
        headers: [
          // NOTE: Cross-Origin-Opener-Policy removed to fix Firebase OAuth popup flow
          // Even 'same-origin-allow-popups' can cause issues with some browsers
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      // CSP for pages (strict)
      {
        source: '/((?!api/).*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: isProd
              ? [
                "default-src 'self'",
                "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://cdn.jsdelivr.net https://apis.google.com https://accounts.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "img-src 'self' data: https: blob:",
                "font-src 'self' data: https://fonts.gstatic.com",
                "connect-src 'self' https://*.googleapis.com https://apis.google.com https://*.firebaseio.com wss://*.firebaseio.com https://api.cannmenus.com https://api.anthropic.com https://www.google.com/recaptcha/ https://accounts.google.com",
                "frame-src 'self' https://www.google.com https://accounts.google.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/ https://studio-567050101-bc6e8.firebaseapp.com",
                "object-src 'none'",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'self'",
                "upgrade-insecure-requests",
              ].join('; ')
              : "default-src 'self' 'unsafe-eval' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' http://localhost:* ws://localhost:* https:;",
          },
        ],
      },
      // CORS headers for API routes
      // Note: For proper CORS with credentials, we handle origin dynamically in middleware
      // Static headers set baseline security, actual origin validation in API routes
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,DELETE,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Authorization, X-Firebase-AppCheck',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
    ];
  },
};
// Cache invalidate: Force rebuild for new secret v7. 2025-12-04 14:51:51
module.exports = nextConfig;
