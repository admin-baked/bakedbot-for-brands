import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/admin/',
          '/super-admin/',
          '/account/',
          '/api/',
          '/debug/',
          '/dev/',
          '/login/',
          '/brand-login/',
          '/dispensary-login/',
          '/customer-login/',
        ],
      },
    ],
    sitemap: 'https://bakedbot.ai/sitemap.xml',
  };
}
