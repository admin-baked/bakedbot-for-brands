/**
 * Brand Competitor Analyzer
 *
 * Uses Ezal agent to analyze competitor brand guides and provide insights.
 * Compares competitor branding with current brand guide.
 */

import { getBrandGuideExtractor } from './brand-guide-extractor';
import { callClaude } from '@/ai/claude';
import { logger } from '@/lib/logger';
import type { BrandGuide, BrandColor, BrandPersonalityTrait } from '@/types/brand-guide';

export interface CompetitorAnalysis {
  competitorName: string;
  competitorUrl: string;
  analyzedAt: Date;
  brandSummary: {
    primaryColor: BrandColor;
    secondaryColor: BrandColor;
    personality: BrandPersonalityTrait[];
    tone: string;
    tagline: string;
    positioning: string;
  };
  comparison: {
    colorSimilarity: number;          // 0-100%
    voiceSimilarity: number;          // 0-100%
    positioningOverlap: number;       // 0-100%
    differentiators: string[];        // What makes us different
    opportunities: string[];          // Gaps they have that we could fill
    threats: string[];                // Things they do better
  };
  recommendations: string[];
}

export interface CompetitorAnalysisInput {
  currentBrandGuide: BrandGuide;
  competitorUrl: string;
  competitorName?: string;
}

export class BrandCompetitorAnalyzer {
  private extractor = getBrandGuideExtractor();

  /**
   * Analyze a competitor's brand and compare with current brand
   */
  async analyzeCompetitor(input: CompetitorAnalysisInput): Promise<CompetitorAnalysis> {
    try {
      logger.info('Analyzing competitor brand', {
        competitorUrl: input.competitorUrl,
      });

      // Step 1: Extract competitor brand information
      const competitorExtraction = await this.extractor.extractFromUrl({
        url: input.competitorUrl,
      });

      // Build a basic BrandGuide from extraction result
      const competitorBrand: BrandGuide = {
        id: `temp_competitor_${Date.now()}`,
        brandId: 'competitor',
        brandName: input.competitorName || 'Competitor',
        version: 1,
        versionHistory: [],
        visualIdentity: competitorExtraction.visualIdentity as any,
        voice: competitorExtraction.voice as any,
        messaging: competitorExtraction.messaging as any,
        compliance: {} as any,
        assets: {} as any,
        suggestions: [],
        sharing: {} as any,
        source: competitorExtraction.source,
        status: 'draft',
        completenessScore: competitorExtraction.confidence,
        createdAt: new Date(),
        createdBy: 'system',
        lastUpdatedAt: new Date(),
        lastUpdatedBy: 'system',
      };

      // Step 2: Compare brands using AI
      const comparison = await this.compareBrands(
        input.currentBrandGuide,
        competitorBrand
      );

      // Step 3: Generate recommendations
      const recommendations = await this.generateRecommendations(
        input.currentBrandGuide,
        competitorBrand,
        comparison
      );

      return {
        competitorName: input.competitorName || competitorBrand.brandName,
        competitorUrl: input.competitorUrl,
        analyzedAt: new Date(),
        brandSummary: {
          primaryColor: competitorBrand.visualIdentity.colors.primary,
          secondaryColor: competitorBrand.visualIdentity.colors.secondary,
          personality: competitorBrand.voice.personality,
          tone: competitorBrand.voice.tone,
          tagline: competitorBrand.messaging.tagline,
          positioning: competitorBrand.messaging.positioning,
        },
        comparison,
        recommendations,
      };
    } catch (error) {
      logger.error('Failed to analyze competitor', { error });
      throw error;
    }
  }

  /**
   * Compare two brands and identify similarities/differences
   */
  private async compareBrands(
    ourBrand: BrandGuide,
    theirBrand: BrandGuide
  ): Promise<CompetitorAnalysis['comparison']> {
    // Calculate color similarity
    const colorSimilarity = this.calculateColorSimilarity(
      ourBrand.visualIdentity.colors,
      theirBrand.visualIdentity.colors
    );

    // Calculate voice similarity
    const voiceSimilarity = this.calculateVoiceSimilarity(
      ourBrand.voice,
      theirBrand.voice
    );

    // Use AI to analyze positioning overlap and identify differentiators
    const analysisPrompt = `
You are a brand strategist analyzing two cannabis brands.

OUR BRAND:
- Name: ${ourBrand.brandName}
- Tagline: ${ourBrand.messaging.tagline}
- Positioning: ${ourBrand.messaging.positioning}
- Personality: ${ourBrand.voice.personality.join(', ')}
- Tone: ${ourBrand.voice.tone}

COMPETITOR BRAND:
- Name: ${theirBrand.brandName}
- Tagline: ${theirBrand.messaging.tagline}
- Positioning: ${theirBrand.messaging.positioning}
- Personality: ${theirBrand.voice.personality.join(', ')}
- Tone: ${theirBrand.voice.tone}

Analyze:
1. Positioning overlap (0-100%)
2. Key differentiators (what makes our brand unique)
3. Opportunities (gaps in competitor's positioning we could fill)
4. Threats (areas where competitor is stronger)

Return as JSON:
{
  "positioningOverlap": number,
  "differentiators": string[],
  "opportunities": string[],
  "threats": string[]
}
`;

    const aiAnalysis = await callClaude({
      userMessage: analysisPrompt,
      systemPrompt: 'You are a brand strategist. Always respond with valid JSON only.',
      maxTokens: 2000,
    });

    let parsed;
    try {
      parsed = JSON.parse(aiAnalysis);
    } catch {
      // Fallback if parsing fails
      parsed = {
        positioningOverlap: 50,
        differentiators: ['Unique brand personality'],
        opportunities: ['Unexplored market segments'],
        threats: ['Strong market presence'],
      };
    }

    return {
      colorSimilarity,
      voiceSimilarity,
      positioningOverlap: parsed.positioningOverlap || 50,
      differentiators: parsed.differentiators || [],
      opportunities: parsed.opportunities || [],
      threats: parsed.threats || [],
    };
  }

  /**
   * Generate strategic recommendations based on competitor analysis
   */
  private async generateRecommendations(
    ourBrand: BrandGuide,
    theirBrand: BrandGuide,
    comparison: CompetitorAnalysis['comparison']
  ): Promise<string[]> {
    const recommendationsPrompt = `
As a brand strategist, provide 3-5 actionable recommendations for our brand based on this competitor analysis.

OUR BRAND: ${ourBrand.brandName}
COMPETITOR: ${theirBrand.brandName}

ANALYSIS:
- Color Similarity: ${comparison.colorSimilarity}%
- Voice Similarity: ${comparison.voiceSimilarity}%
- Positioning Overlap: ${comparison.positioningOverlap}%
- Differentiators: ${comparison.differentiators.join(', ')}
- Opportunities: ${comparison.opportunities.join(', ')}
- Threats: ${comparison.threats.join(', ')}

Provide specific, actionable recommendations as a JSON array of strings.
Format: ["recommendation 1", "recommendation 2", ...]
`;

    const response = await callClaude({
      userMessage: recommendationsPrompt,
      systemPrompt: 'You are a brand strategist. Return only a JSON array of recommendation strings.',
      maxTokens: 1000,
    });

    try {
      const recommendations = JSON.parse(response);
      return Array.isArray(recommendations) ? recommendations : [];
    } catch {
      return [
        'Emphasize unique brand differentiators in messaging',
        'Adjust visual identity to stand out from competitors',
        'Target underserved market segments',
      ];
    }
  }

  /**
   * Calculate similarity between two color palettes (0-100%)
   */
  private calculateColorSimilarity(
    colors1: BrandGuide['visualIdentity']['colors'],
    colors2: BrandGuide['visualIdentity']['colors']
  ): number {
    const similarity1 = this.colorDistance(colors1.primary.hex, colors2.primary.hex);
    const similarity2 = this.colorDistance(colors1.secondary.hex, colors2.secondary.hex);
    const similarity3 = this.colorDistance(colors1.accent.hex, colors2.accent.hex);

    // Average similarity, inverted (closer = higher similarity)
    const avgDistance = (similarity1 + similarity2 + similarity3) / 3;
    return Math.max(0, 100 - avgDistance);
  }

  /**
   * Calculate Euclidean distance between two colors in RGB space
   */
  private colorDistance(hex1: string, hex2: string): number {
    const rgb1 = this.hexToRgb(hex1);
    const rgb2 = this.hexToRgb(hex2);

    const rDiff = rgb1.r - rgb2.r;
    const gDiff = rgb1.g - rgb2.g;
    const bDiff = rgb1.b - rgb2.b;

    // Euclidean distance, normalized to 0-100
    const distance = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
    return (distance / 441.67) * 100; // Max distance in RGB space is ~441.67
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  /**
   * Calculate similarity between two brand voices (0-100%)
   */
  private calculateVoiceSimilarity(
    voice1: BrandGuide['voice'],
    voice2: BrandGuide['voice']
  ): number {
    // Count matching personality traits
    const matchingTraits = voice1.personality.filter((trait) =>
      voice2.personality.includes(trait)
    ).length;
    const totalTraits = Math.max(voice1.personality.length, voice2.personality.length);
    const traitSimilarity = totalTraits > 0 ? (matchingTraits / totalTraits) * 100 : 0;

    // Check tone match
    const toneSimilarity = voice1.tone === voice2.tone ? 100 : 0;

    // Average
    return (traitSimilarity + toneSimilarity) / 2;
  }

  /**
   * Batch analyze multiple competitors
   */
  async analyzeCompetitors(
    currentBrandGuide: BrandGuide,
    competitorUrls: Array<{ url: string; name?: string }>
  ): Promise<CompetitorAnalysis[]> {
    const analyses: CompetitorAnalysis[] = [];

    for (const competitor of competitorUrls) {
      try {
        const analysis = await this.analyzeCompetitor({
          currentBrandGuide,
          competitorUrl: competitor.url,
          competitorName: competitor.name,
        });
        analyses.push(analysis);
      } catch (error) {
        logger.error('Failed to analyze competitor', {
          url: competitor.url,
          error,
        });
        // Continue with other competitors
      }
    }

    return analyses;
  }
}

// Singleton instance
let instance: BrandCompetitorAnalyzer | null = null;

export function getBrandCompetitorAnalyzer(): BrandCompetitorAnalyzer {
  if (!instance) {
    instance = new BrandCompetitorAnalyzer();
  }
  return instance;
}
