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
   * Scrape a list of subpages in parallel and return their combined markdown.
   * Silently skips pages that 404 or fail.
   */
  private async scrapeSubpages(baseUrl: string): Promise<string> {
    const base = baseUrl.replace(/\/$/, '');
    const candidates = BrandGuideExtractor.BRAND_SUBPAGES.map((path) => `${base}${path}`);

    const results = await Promise.allSettled(
      candidates.map((subUrl) =>
        this.discovery.discoverUrl(subUrl).then((r) => ({ subUrl, content: r.markdown || '' }))
      )
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

      // Merge root + subpage content (root first so metadata is prioritised)
      const combinedContent = (rootResult.markdown || '') + subpageContent;

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
          description: rootResult.metadata?.description,
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
    const prompt = `Analyze the following brand data and extract visual identity information.

Website: ${website.url}
Colors found: ${website.colors.join(', ')}
Fonts found: ${website.fonts.join(', ')}
Website content sample: ${website.content.substring(0, 2000)}

${social.length > 0 ? `Social media profiles analyzed: ${social.map((s) => s.platform).join(', ')}` : ''}

Extract and structure:
1. Primary, secondary, and accent colors (hex codes)
2. Font families used for headings and body text
3. Visual style description
4. Color usage guidelines

Return a JSON object with this structure:
{
  "logo": {
    "primary": "URL if found in og:image or favicon",
    "specifications": {}
  },
  "colors": {
    "primary": { "hex": "#XXXXXX", "name": "Color Name", "usage": "Where it's used" },
    "secondary": { "hex": "#XXXXXX", "name": "Color Name", "usage": "Where it's used" },
    "accent": { "hex": "#XXXXXX", "name": "Color Name", "usage": "Where it's used" },
    "text": { "hex": "#XXXXXX", "name": "Color Name", "usage": "Body text" },
    "background": { "hex": "#XXXXXX", "name": "Color Name", "usage": "Backgrounds" }
  },
  "typography": {
    "headingFont": { "family": "Font Name", "weights": [400, 700], "source": "google" },
    "bodyFont": { "family": "Font Name", "weights": [400], "source": "google" }
  },
  "imagery": {
    "style": "lifestyle|product-focused|abstract|mixed",
    "guidelines": "Description of photo style"
  }
}`;

    try {
      const response = await callClaude({
        userMessage: prompt,
        systemPrompt:
          'You are a brand identity expert. Extract visual brand elements and return valid JSON only.',
        maxTokens: 2000,
      });

      // Parse AI response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
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
    const prompt = `Analyze the following website content and extract brand messaging.
The content may include the homepage plus About Us / Our Story pages — prioritise those for brand story elements.

Website: ${website.url}
Title: ${website.metadata.title || 'Unknown'}
Description: ${website.metadata.description || 'Unknown'}
Content sample: ${website.content.substring(0, 5000)}

Extract and structure:
1. **Brand Name** - The exact business name as it appears on the website (e.g., "Thrive Syracuse", not "thrivesyracuse.com")
2. **Tagline** - Short catchphrase or slogan (usually 2-6 words, appears near the brand name or in hero sections)
3. **Positioning statement** - How the brand describes itself (1-2 sentences)
4. **Mission statement** - If explicitly stated (look for "Our Mission", "What We Do", etc.)
5. **Value propositions** - Key benefits or unique selling points (usually 2-4 bullet points from About Us)
6. **Brand story** - Origin story, values, and differentiators from About Us content

IMPORTANT:
- Extract the brand name EXACTLY as written on the page (proper spacing and capitalization)
- Tagline should be SHORT (not a full sentence) - look for text near logos or in hero sections
- For descriptions, use the first clear sentence from About Us that explains what they do

Return a JSON object with this structure:
{
  "brandName": "Exact brand name from the page",
  "tagline": "Short slogan or catchphrase",
  "positioning": "How the brand positions itself (1-2 sentences)",
  "missionStatement": "Mission statement if found",
  "valuePropositions": ["Value prop 1", "Value prop 2", "Value prop 3"],
  "brandStory": {
    "origin": "Founding story if available",
    "values": ["Value 1", "Value 2"],
    "differentiators": ["What makes them unique"]
  }
}`;

    try {
      const response = await callClaude({
        userMessage: prompt,
        systemPrompt:
          'You are a brand strategist. Extract messaging elements and return valid JSON only, wrapped in a ```json code block if needed.',
        maxTokens: 1500,
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

      // Validate that we got meaningful data (not all placeholders)
      if (!parsed.brandName && !parsed.positioning && !parsed.tagline && !parsed.missionStatement) {
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
    // Extract brand name from title (strip common suffixes)
    const titleDerivedName = website.metadata.title
      ? website.metadata.title
          .split(/\s*[\|\-–]\s*/)[0]
          .replace(/\.(com|net|org|io|co|ca|us|biz|info)(\s.*)?$/i, '')
          .trim()
      : '';

    return {
      brandName: titleDerivedName,
      tagline: website.metadata.description
        ? website.metadata.description.split('.')[0].trim().substring(0, 100)
        : '',
      positioning: website.metadata.description || `Cannabis brand based in your area`,
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
