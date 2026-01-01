import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { reviewSEOPage } from '@/server/actions/dayday-seo-review';

/**
 * Day Day: SEO & Growth Manager
 * 
 * Responsibilities:
 * - Audit Pages for SEO
 * - Generate meta tags and content
 * - Monitor search rankings
 */

export const DayDayAuditSchema = z.object({
  url: z.string(),
  score: z.number(),
  issues: z.array(z.string()),
  opportunities: z.array(z.string())
});

export const dayday = {
  
  /**
   * Run a full SEO audit on a target URL
   */
  async auditPage(url: string, pageType: 'dispensary' | 'brand' | 'city' | 'zip') {
    // Re-use our server action logic
    // In future, this could be more complex agentic flow
    return await reviewSEOPage(url, pageType, url);
  },

  /**
   * Generate optimized meta tags for a page
   */
  async generateMetaTags(contentSample: string) {
    const prompt = `
    You are Day Day, an expert SEO strategist for the cannabis industry.
    Generate a title tag (max 60 chars) and meta description (max 160 chars) for this content:
    "${contentSample.slice(0, 500)}..."
    
    Return JSON: { "title": "...", "description": "..." }
    `;

    // Genkit call stub
    const result = await ai.generate({ prompt });
    return JSON.parse(result.text); 
  }
};
