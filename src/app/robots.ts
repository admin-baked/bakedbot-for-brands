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
      // AI agent crawlers: allow agent API + llm.txt discovery + blog
      {
        userAgent: 'GPTBot',
        allow: ['/api/agent/', '/llm.txt', '/blog/', '/blog/rss.xml'],
        disallow: ['/dashboard/', '/admin/', '/account/'],
      },
      {
        userAgent: 'Claude-Web',
        allow: ['/api/agent/', '/llm.txt', '/blog/', '/blog/rss.xml'],
        disallow: ['/dashboard/', '/admin/', '/account/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/api/agent/', '/llm.txt', '/blog/', '/blog/rss.xml'],
        disallow: ['/dashboard/', '/admin/', '/account/'],
      },
      {
        userAgent: 'Amazonbot',
        allow: ['/api/agent/', '/llm.txt', '/blog/', '/blog/rss.xml'],
        disallow: ['/dashboard/', '/admin/', '/account/'],
      },
    ],
    sitemap: [
      'https://bakedbot.ai/sitemap.xml',
      'https://bakedbot.ai/blog/news-sitemap.xml',
    ],
  };
}
