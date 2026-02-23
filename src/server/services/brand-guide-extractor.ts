/**
 * Brand Guide Extractor Service
 *
 * Automatically extracts brand guide information from:
 * - Website URLs (using Firecrawl)
 * - Social media profiles (Instagram, Twitter, Facebook)
 * - Logo/image analysis
 * - Content voice analysis
 *
 * Uses AI to analyze and structure brand data into BrandGuide format.
 */

import { callClaude } from '@/ai/claude';
import { DiscoveryService } from './firecrawl';
import type {
  BrandGuide,
  BrandVisualIdentity,
  BrandVoice,
  BrandMessaging,
  ExtractBrandGuideFromUrlInput,
  BrandGuideSource,
  BrandColor,
} from '@/types/brand-guide';
import {
  hexToRgb,
  getContrastRatio,
  checkWCAGLevel,
  type ContrastResult,
} from '@/lib/accessibility-checker';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

interface WebsiteAnalysis {
  url: string;
  content: string;
  metadata: {
    title?: string;
    description?: string;
    ogImage?: string;
    favicon?: string;
  };
  colors: string[];
  fonts: string[];
  textSamples: string[];
}

interface SocialMediaAnalysis {
  platform: 'instagram' | 'twitter' | 'facebook' | 'linkedin';
  handle: string;
  profileUrl: string;
  bio?: string;
  posts: Array<{
    text: string;
    engagement?: number;
    timestamp?: Date;
  }>;
  colors?: string[];
  visualStyle?: string;
}

interface ExtractionResult {
  visualIdentity: Partial<BrandVisualIdentity>;
  voice: Partial<BrandVoice>;
  messaging: Partial<BrandMessaging>;
  source: BrandGuideSource;
  confidence: number; // 0-100
  websiteTitle?: string;
  metadata?: {
    title?: string;
    description?: string;
    ogImage?: string;
    favicon?: string;
  };
}

// ============================================================================
// BRAND GUIDE EXTRACTOR CLASS
// ============================================================================

export class BrandGuideExtractor {
  private discovery: DiscoveryService;

  constructor() {
    this.discovery = DiscoveryService.getInstance();
  }

  /**
   * Extract brand guide from URL and optional social handles
   */
  async extractFromUrl(
    input: ExtractBrandGuideFromUrlInput
  ): Promise<ExtractionResult> {
    logger.info('Starting brand guide extraction', { url: input.url });

    try {
      // Step 1: Scrape website
      const websiteAnalysis = await this.analyzeWebsite(input.url);

      // Step 2: Analyze social media (if handles provided)
      const socialAnalyses: SocialMediaAnalysis[] = [];
      if (input.socialHandles) {
        if (input.socialHandles.instagram) {
          const analysis = await this.analyzeSocialMedia(
            'instagram',
            input.socialHandles.instagram
          );
          if (analysis) socialAnalyses.push(analysis);
        }
        if (input.socialHandles.twitter) {
          const analysis = await this.analyzeSocialMedia(
            'twitter',
            input.socialHandles.twitter
          );
          if (analysis) socialAnalyses.push(analysis);
        }
        if (input.socialHandles.facebook) {
          const analysis = await this.analyzeSocialMedia(
            'facebook',
            input.socialHandles.facebook
          );
          if (analysis) socialAnalyses.push(analysis);
        }
      }

      // Step 3: Extract visual identity
      const visualIdentity = await this.extractVisualIdentity(
        websiteAnalysis,
        socialAnalyses
      );

      // Step 4: Extract brand voice
      const voice = await this.extractBrandVoice(
        websiteAnalysis,
        socialAnalyses
      );

      // Step 5: Extract messaging
      const messaging = await this.extractMessaging(websiteAnalysis);

      // Step 6: Calculate confidence score
      const confidence = this.calculateConfidence(
        websiteAnalysis,
        socialAnalyses,
        visualIdentity,
        voice,
        messaging
      );

      // Step 7: Build source metadata
      const source: BrandGuideSource = {
        method: socialAnalyses.length > 0 ? 'hybrid' : 'url_extraction',
        sourceUrl: input.url,
        socialMediaSources: socialAnalyses.map((s) => ({
          platform: s.platform,
          handle: s.handle,
          profileUrl: s.profileUrl,
          extractedData: {
            bio: s.bio,
            posts: s.posts,
            colors: s.colors,
            visualStyle: s.visualStyle,
          },
        })),
        extractedAt: new Date(),
        extractionConfidence: confidence,
      };

      logger.info('Brand guide extraction completed', {
        url: input.url,
        confidence,
      });

      return {
        visualIdentity,
        voice,
        messaging,
        source,
        confidence,
        websiteTitle: websiteAnalysis.metadata.title,
        metadata: websiteAnalysis.metadata,  // exposes title + description for client pre-fill
      };
    } catch (error) {
      logger.error('Brand guide extraction failed', { error, url: input.url });
      throw new Error(`Failed to extract brand guide: ${(error as Error).message}`);
    }
  }

  /**
   * Common subpage paths that contain brand/about content.
   * We try these after the root page to get richer brand story data.
   */
  private static readonly BRAND_SUBPAGES = [
    '/about-us',
    '/about-us/',
    '/about',
    '/about/',
    '/our-story',
    '/our-story/',
    '/who-we-are',
    '/mission',
    '/contact',
  ];

  /**
   * Direct HTTP fetch as last-resort fallback when Firecrawl/RTRVR both fail.
   * Returns plaintext content stripped of HTML tags. Useful for cannabis sites
   * that may be blocked by Firecrawl's content policy.
   */
  private async fetchDirectly(url: string): Promise<string> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BakedBotBot/1.0; +https://bakedbot.ai/llm.txt)',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: controller.signal,
        });
        if (!response.ok) return '';
        const html = await response.text();
        // Strip scripts, styles and HTML tags; decode common entities
        return html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 8000);
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      logger.debug('[BrandGuideExtractor] Direct fetch failed', { url, error: (err as Error).message });
      return '';
    }
  }

  /**
   * Scrape a list of subpages in parallel and return their combined markdown.
   * Falls back to direct HTTP fetch when Firecrawl/RTRVR both fail (e.g. cannabis
   * sites blocked by content policy). Silently skips pages that are empty.
   */
  private async scrapeSubpages(baseUrl: string): Promise<string> {
    const base = baseUrl.replace(/\/$/, '');
    const candidates = BrandGuideExtractor.BRAND_SUBPAGES.map((path) => `${base}${path}`);

    const results = await Promise.allSettled(
      candidates.map(async (subUrl) => {
        let content = '';
        try {
          const r = await this.discovery.discoverUrl(subUrl);
          content = r.markdown || '';
        } catch {
          // Firecrawl and RTRVR both failed — try direct HTTP fetch as last resort
          content = await this.fetchDirectly(subUrl);
        }
        return { subUrl, content };
      })
    );

    const parts: string[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.content.trim().length > 100) {
        logger.info('[BrandGuideExtractor] Scraped subpage', { url: result.value.subUrl, chars: result.value.content.length });
        parts.push(`\n\n<!-- subpage: ${result.value.subUrl} -->\n${result.value.content}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Analyze website content and extract data.
   * Scrapes the root URL plus key brand subpages (About Us, Our Story, etc.)
   * to capture richer brand context before AI extraction.
   */
  private async analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
    try {
      logger.info('[BrandGuideExtractor] Starting website analysis', { url });

      // Step 1: Scrape root URL + subpages in parallel
      const [rootResult, subpageContent] = await Promise.all([
        this.discovery.discoverUrl(url),
        this.scrapeSubpages(url),
      ]);

      if (!rootResult.markdown) {
        logger.warn('[BrandGuideExtractor] No markdown content returned from root scrape', { url });
      }

      // If root content is minimal (likely blocked/age-gated), try direct fetch as last resort
      let rootMarkdown = rootResult.markdown || '';
      if (rootMarkdown.length < 300) {
        logger.warn('[BrandGuideExtractor] Root content minimal, trying direct fetch', { url, chars: rootMarkdown.length });
        const directContent = await this.fetchDirectly(url);
        if (directContent.length > rootMarkdown.length) {
          rootMarkdown = directContent;
          logger.info('[BrandGuideExtractor] Direct fetch augmented root content', { url, chars: directContent.length });
        }
      }

      // Merge root + subpage content (root first so metadata is prioritised)
      const combinedContent = rootMarkdown + subpageContent;

      // Extract colors from content (looking for hex codes)
      const colors = this.extractColors(combinedContent);
      logger.debug('[BrandGuideExtractor] Extracted colors', { url, count: colors.length });

      // Extract fonts from content (if mentioned)
      const fonts = this.extractFonts(combinedContent);
      logger.debug('[BrandGuideExtractor] Extracted fonts', { url, count: fonts.length });

      // Extract text samples for voice analysis
      const textSamples = this.extractTextSamples(combinedContent);
      logger.debug('[BrandGuideExtractor] Extracted text samples', { url, count: textSamples.length });

      logger.info('[BrandGuideExtractor] Website analysis completed successfully', {
        url,
        colorsFound: colors.length,
        fontsFound: fonts.length,
        textSamplesFound: textSamples.length,
        subpageChars: subpageContent.length,
      });

      return {
        url,
        content: combinedContent,
        metadata: {
          title: rootResult.metadata?.title,
          // Some sites (e.g. Thrive Syracuse) have no <meta name="description"> but do have
          // og:description — prefer whichever is non-empty
          description: rootResult.metadata?.description || rootResult.metadata?.ogDescription,
          ogImage: rootResult.metadata?.ogImage,
          favicon: rootResult.metadata?.favicon,
        },
        colors,
        fonts,
        textSamples,
      };
    } catch (error) {
      logger.error('[BrandGuideExtractor] Website analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        url
      });
      throw error;
    }
  }

  /**
   * Analyze social media profile
   */
  private async analyzeSocialMedia(
    platform: 'instagram' | 'twitter' | 'facebook' | 'linkedin',
    handle: string
  ): Promise<SocialMediaAnalysis | null> {
    try {
      // Note: In production, this would use actual social media APIs
      // For now, we'll use web scraping as a fallback

      const profileUrl = this.getSocialMediaUrl(platform, handle);

      // Try to scrape the profile
      const scrapeResult = await this.discovery.discoverUrl(profileUrl);

      if (!scrapeResult.markdown) {
        logger.warn('No content found for social profile', {
          platform,
          handle,
        });
        return null;
      }

      // Extract posts/content
      const posts = this.extractSocialPosts(scrapeResult.markdown, platform);

      // Extract bio
      const bio = this.extractSocialBio(scrapeResult.markdown, platform);

      return {
        platform,
        handle,
        profileUrl,
        bio,
        posts,
      };
    } catch (error) {
      logger.warn('Social media analysis failed', { error, platform, handle });
      return null; // Non-fatal error
    }
  }

  /**
   * Extract visual identity using AI
   */
  private async extractVisualIdentity(
    website: WebsiteAnalysis,
    social: SocialMediaAnalysis[]
  ): Promise<Partial<BrandVisualIdentity>> {
    const prompt = `You are a brand identity expert. Analyze the following brand website content and extract visual identity information.

IMPORTANT: The website colors, fonts, and content below may have limited color hex codes. Use your knowledge of cannabis dispensary branding and the content to intelligently infer appropriate brand colors even if not all hex codes are explicitly present.

Website URL: ${website.url}
Website Title: ${website.metadata?.title || 'Unknown'}
Detected Colors (hex codes if found): ${website.colors.length > 0 ? website.colors.join(', ') : 'None detected in text content'}
Detected Fonts: ${website.fonts.length > 0 ? website.fonts.join(', ') : 'Standard web fonts'}
Logo/Image URL: ${website.metadata?.ogImage || website.metadata?.favicon || 'Not found'}

Website Content (from About Us and main pages):
${website.content.substring(0, 3000)}

${social.length > 0 ? `Social media profiles analyzed: ${social.map((s) => s.platform).join(', ')}` : ''}

EXTRACTION REQUIREMENTS:
1. **Brand Colors**: Even if hex codes weren't detected in scraped content, use the website content tone/style to infer appropriate primary and secondary colors. For cannabis brands, consider earthy greens, premium blacks, or modern grays.
2. **Logo**: Return the og:image or favicon URL if available
3. **Font Families**: Infer from content style (premium brands → serif, modern brands → sans-serif)
4. **Visual Style**: Describe the overall aesthetic

Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "logo": {
    "primary": "URL or null if not found"
  },
  "colors": {
    "primary": { "hex": "#4ade80", "name": "Cannabis Green", "usage": "Primary brand color" },
    "secondary": { "hex": "#1a1a2e", "name": "Dark Navy", "usage": "Text and accents" },
    "accent": { "hex": "#ffffff", "name": "White", "usage": "Backgrounds and contrast" }
  },
  "typography": {
    "headingFont": { "family": "Inter", "weights": [600, 700], "source": "google" },
    "bodyFont": { "family": "Inter", "weights": [400], "source": "google" }
  },
  "imagery": {
    "style": "professional",
    "guidelines": "Professional cannabis dispensary aesthetic"
  }
}`;

    try {
      const response = await callClaude({
        userMessage: prompt,
        systemPrompt:
          'You are a brand identity expert specializing in cannabis dispensary branding. Extract visual brand elements and return ONLY valid JSON, no other text.',
        maxTokens: 2000,
      });

      // Parse AI response - be flexible with whitespace and code blocks
      let jsonStr = response.trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('No JSON found in visual identity response', { url: website.url, response: response.substring(0, 200) });
        return this.createFallbackVisualIdentity(website);
      }

      const visualIdentity = JSON.parse(jsonMatch[0]);

      // Validate and enrich colors with accessibility data
      if (visualIdentity.colors) {
        visualIdentity.colors = await this.enrichColorsWithAccessibility(
          visualIdentity.colors
        );
      }

      return visualIdentity;
    } catch (error) {
      logger.error('Visual identity extraction failed', { error });
      // Return best-effort fallback
      return this.createFallbackVisualIdentity(website);
    }
  }

  /**
   * Extract brand voice using AI
   */
  private async extractBrandVoice(
    website: WebsiteAnalysis,
    social: SocialMediaAnalysis[]
  ): Promise<Partial<BrandVoice>> {
    const allTextSamples = [
      ...website.textSamples,
      ...social.flatMap((s) => s.posts.map((p) => p.text)),
    ];

    const prompt = `Analyze the following content samples and extract brand voice characteristics.

Content samples:
${allTextSamples.slice(0, 10).join('\n\n---\n\n')}

Extract and structure:
1. Personality traits (e.g., Friendly, Professional, Playful)
2. Tone (professional, casual, playful, sophisticated, educational)
3. Writing style characteristics
4. Preferred vocabulary and terms to avoid
5. Common cannabis terminology used

Return a JSON object with this structure:
{
  "personality": ["Trait1", "Trait2", "Trait3"],
  "tone": "casual|professional|playful|sophisticated",
  "writingStyle": {
    "sentenceLength": "short|medium|long|varied",
    "paragraphLength": "concise|moderate|detailed",
    "useEmojis": boolean,
    "useExclamation": boolean,
    "useQuestions": boolean,
    "useHumor": boolean,
    "formalityLevel": 1-5,
    "complexity": "simple|moderate|advanced",
    "perspective": "first-person|second-person|third-person"
  },
  "vocabulary": {
    "preferred": [{"term": "Preferred term", "instead": "Instead of", "context": "When to use"}],
    "avoid": [{"term": "Term to avoid", "reason": "Why to avoid"}]
  },
  "sampleContent": [
    {
      "type": "social_post|product_description|email",
      "content": "Example of brand voice",
      "audience": "Target audience"
    }
  ]
}`;

    try {
      const response = await callClaude({
        userMessage: prompt,
        systemPrompt:
          'You are a brand voice expert. Analyze writing style and return valid JSON only.',
        maxTokens: 2000,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Brand voice extraction failed', { error });
      return this.createFallbackBrandVoice();
    }
  }

  /**
   * Extract messaging using AI
   */
  private async extractMessaging(
    website: WebsiteAnalysis
  ): Promise<Partial<BrandMessaging>> {
    const prompt = `You are a cannabis industry brand strategist. Extract detailed brand messaging information from this website content.
The content includes the homepage PLUS About Us / Our Story / Mission pages — use ALL available content for brand story elements.

Website URL: ${website.url}
Page Title: ${website.metadata.title || 'Unknown'}
Meta Description: ${website.metadata.description || 'Unknown'}

FULL WEBSITE CONTENT (Homepage + About Us pages):
${website.content}

EXTRACTION TASK:
Extract the following brand messaging elements from the provided content:

1. **Brand Name** - The exact business name as written on the website (e.g., "Thrive Syracuse", not "thrivesyracuse.com" or domain variants)
2. **Tagline** - A short slogan (2-6 words) that often appears with the brand name or in hero sections
3. **Positioning** - 1-2 sentences describing what the company does and who they serve
4. **Mission Statement** - If explicitly stated (look for "Our Mission", "Mission", "What We Do", "Our Purpose")
5. **Value Propositions** - 2-4 key benefits, promises, or unique value points the company emphasizes
6. **Brand Story** - Information from About Us pages:
   - Origin: Founding story, how the company started
   - Values: Principles and values the company emphasizes
   - Differentiators: What makes them unique compared to competitors

IMPORTANT NOTES:
- Extract EXACTLY what's on the page - don't invent information
- Use NULL or empty values if content is not found, rather than making things up
- The website may have limited About Us content - extract what IS present
- Focus on factual company information, not marketing fluff or placeholders
- Pay special attention to About Us / Our Story sections for brand story elements

Return ONLY a valid JSON object (no markdown formatting):
{
  "brandName": "Exact name or null",
  "tagline": "Short slogan or null",
  "positioning": "1-2 sentence description or null",
  "missionStatement": "Mission or null",
  "valuePropositions": ["prop1", "prop2", "prop3"] or [],
  "brandStory": {
    "origin": "Founding story or null",
    "values": ["value1", "value2"] or [],
    "differentiators": ["unique1", "unique2"] or []
  }
}`;

    try {
      const response = await callClaude({
        userMessage: prompt,
        systemPrompt:
          'You are a cannabis dispensary brand strategist. Extract messaging elements from the provided content and return ONLY valid JSON, no markdown or code blocks.',
        maxTokens: 2000,
      });

      // Try to extract JSON from code block first, then fallback to direct parsing
      let jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      let jsonStr = jsonMatch ? jsonMatch[1] : null;

      if (!jsonStr) {
        // Fallback: try to find raw JSON
        jsonMatch = response.match(/\{[\s\S]*\}/);
        jsonStr = jsonMatch ? jsonMatch[0] : null;
      }

      if (!jsonStr) {
        logger.warn('No JSON found in messaging extraction response', { url: website.url, response: response.substring(0, 200) });
        return this.createFallbackMessaging(website);
      }

      const parsed = JSON.parse(jsonStr);

      // Validate that we got meaningful data (not all nulls)
      const hasData = parsed.brandName || parsed.positioning || parsed.tagline || parsed.missionStatement;
      if (!hasData) {
        logger.warn('Extracted messaging has no meaningful data', { url: website.url, parsed });
        return this.createFallbackMessaging(website);
      }

      return parsed;
    } catch (error) {
      logger.error('Messaging extraction failed', { error, url: website.url });
      return this.createFallbackMessaging(website);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Extract hex color codes from content
   */
  private extractColors(content: string): string[] {
    const hexRegex = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;
    const matches = content.match(hexRegex) || [];
    return [...new Set(matches)].slice(0, 10); // Dedupe and limit
  }

  /**
   * Extract font names from content
   */
  private extractFonts(content: string): string[] {
    const commonFonts = [
      'Arial',
      'Helvetica',
      'Times',
      'Georgia',
      'Verdana',
      'Courier',
      'Roboto',
      'Open Sans',
      'Lato',
      'Montserrat',
      'Inter',
      'Poppins',
      'Nunito',
      'Raleway',
      'Ubuntu',
    ];

    const foundFonts = commonFonts.filter((font) =>
      content.toLowerCase().includes(font.toLowerCase())
    );

    return foundFonts.slice(0, 5);
  }

  /**
   * Extract text samples for voice analysis
   */
  private extractTextSamples(content: string): string[] {
    // Split by paragraphs and filter meaningful content
    const paragraphs = content
      .split('\n\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 50 && p.length < 500) // Meaningful paragraphs
      .filter((p) => !p.startsWith('#')) // Skip headers
      .filter((p) => !p.includes('©')) // Skip copyright
      .filter((p) => !p.includes('http')); // Skip URLs

    return paragraphs.slice(0, 30); // Limit to 30 samples (more subpage content now)
  }

  /**
   * Get social media profile URL
   */
  private getSocialMediaUrl(
    platform: 'instagram' | 'twitter' | 'facebook' | 'linkedin',
    handle: string
  ): string {
    const cleanHandle = handle.replace('@', '');
    switch (platform) {
      case 'instagram':
        return `https://www.instagram.com/${cleanHandle}/`;
      case 'twitter':
        return `https://twitter.com/${cleanHandle}`;
      case 'facebook':
        return `https://www.facebook.com/${cleanHandle}`;
      case 'linkedin':
        return `https://www.linkedin.com/company/${cleanHandle}`;
    }
  }

  /**
   * Extract posts from social media content
   */
  private extractSocialPosts(
    content: string,
    platform: string
  ): Array<{ text: string; engagement?: number }> {
    // Simple extraction - in production, use proper API
    const paragraphs = content
      .split('\n\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 20 && p.length < 500);

    return paragraphs.slice(0, 10).map((text) => ({ text }));
  }

  /**
   * Extract bio from social media content
   */
  private extractSocialBio(content: string, platform: string): string {
    // Simple extraction - look for bio-like content
    const lines = content.split('\n').filter((l) => l.length > 10 && l.length < 200);
    return lines[0] || '';
  }

  /**
   * Enrich colors with accessibility data
   */
  private async enrichColorsWithAccessibility(colors: {
    primary: BrandColor;
    secondary: BrandColor;
    accent: BrandColor;
    text: BrandColor;
    background: BrandColor;
  }): Promise<typeof colors> {
    // Check each color against white background
    for (const [key, color] of Object.entries(colors)) {
      if (color && color.hex) {
        const bgColor = key === 'background' ? '#FFFFFF' : colors.background?.hex || '#FFFFFF';
        const ratio = getContrastRatio(color.hex, bgColor);
        if (ratio) {
          const check = checkWCAGLevel(ratio);
          color.accessibility = {
            wcagLevel: check.level,
            contrastRatio: check.ratio,
            textReadable: check.textReadable,
          };
        }
      }
    }
    return colors;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(
    website: WebsiteAnalysis,
    social: SocialMediaAnalysis[],
    visualIdentity: Partial<BrandVisualIdentity>,
    voice: Partial<BrandVoice>,
    messaging: Partial<BrandMessaging>
  ): number {
    let score = 0;

    // Website data quality (30 points)
    if (website.colors.length > 0) score += 5;
    if (website.fonts.length > 0) score += 5;
    if (website.textSamples.length > 5) score += 10;
    if (website.metadata.title) score += 5;
    if (website.metadata.description) score += 5;

    // Social media data (20 points)
    score += Math.min(social.length * 5, 20);

    // Extracted data completeness (50 points)
    if (visualIdentity.colors) score += 15;
    if (visualIdentity.typography) score += 10;
    if (voice.personality && voice.personality.length > 0) score += 10;
    if (voice.writingStyle) score += 5;
    if (messaging.tagline) score += 5;
    if (messaging.positioning) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Create fallback visual identity
   */
  private createFallbackVisualIdentity(
    website: WebsiteAnalysis
  ): Partial<BrandVisualIdentity> {
    const colors = website.colors.length > 0 ? website.colors : ['#2D5016', '#C9A05F'];

    return {
      logo: {
        primary: website.metadata.ogImage || website.metadata.favicon || '',
      },
      colors: {
        primary: {
          hex: colors[0] || '#2D5016',
          name: 'Primary Color',
          usage: 'Main brand color',
        },
        secondary: {
          hex: colors[1] || '#C9A05F',
          name: 'Secondary Color',
          usage: 'Accent elements',
        },
        accent: {
          hex: colors[2] || '#1A1A1A',
          name: 'Accent Color',
          usage: 'Highlights',
        },
        text: {
          hex: '#2C2C2C',
          name: 'Text',
          usage: 'Body text',
        },
        background: {
          hex: '#FFFFFF',
          name: 'Background',
          usage: 'Page backgrounds',
        },
      },
      typography: {
        headingFont: {
          family: website.fonts[0] || 'Inter',
          weights: [400, 700],
          source: 'google',
        },
        bodyFont: {
          family: website.fonts[1] || 'Open Sans',
          weights: [400],
          source: 'google',
        },
      },
    };
  }

  /**
   * Create fallback brand voice
   */
  private createFallbackBrandVoice(): Partial<BrandVoice> {
    return {
      personality: ['Friendly', 'Professional'],
      tone: 'professional',
      writingStyle: {
        sentenceLength: 'medium',
        paragraphLength: 'moderate',
        useEmojis: false,
        useExclamation: false,
        useQuestions: true,
        useHumor: false,
        formalityLevel: 3,
        complexity: 'moderate',
        perspective: 'second-person',
      },
      vocabulary: {
        preferred: [],
        avoid: [],
        cannabisTerms: [],
      },
      sampleContent: [],
    };
  }

  /**
   * Create fallback messaging
   */
  private createFallbackMessaging(website: WebsiteAnalysis): Partial<BrandMessaging> {
    // Extract brand name from title — handles both "Brand - Tagline" and "Page - Brand" patterns.
    // Filters out generic page-name segments (About Us, Home, Verify Age, etc.) and picks the
    // first remaining segment, which is most likely the actual brand name.
    const GENERIC_PAGE_WORDS = ['home', 'about', 'contact', 'menu', 'products', 'verify', 'welcome', 'shop'];
    const titleDerivedName = (() => {
      if (!website.metadata.title) return '';
      const segments = website.metadata.title.split(/\s*[\|\-–]\s*/);
      const nonGeneric = segments.find(s => {
        const lower = s.toLowerCase().trim();
        return !GENERIC_PAGE_WORDS.some(w => lower.startsWith(w)) && s.trim().length >= 3;
      });
      const best = (nonGeneric || segments[0] || '').trim();
      return best.replace(/\.(com|net|org|io|co|ca|us|biz|info)(\s.*)?$/i, '').trim();
    })();

    return {
      brandName: titleDerivedName,
      tagline: website.metadata.description
        ? website.metadata.description.split('.')[0].trim().substring(0, 100)
        : '',
      positioning: website.metadata.description || '',
      valuePropositions: website.metadata.description
        ? [website.metadata.description.substring(0, 150)]
        : [],
    };
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

let extractorInstance: BrandGuideExtractor | null = null;

export function getBrandGuideExtractor(): BrandGuideExtractor {
  if (!extractorInstance) {
    extractorInstance = new BrandGuideExtractor();
  }
  return extractorInstance;
}
