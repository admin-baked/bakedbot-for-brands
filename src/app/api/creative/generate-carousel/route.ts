/**
 * API Route: Generate AI Carousel Slides
 * POST /api/creative/generate-carousel
 *
 * Uses Gemini to generate carousel slide copy and optionally images.
 * - Free tier: Gemini 2.5 Flash
 * - Paid tier: Gemini 3 Pro (when available)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { logger } from '@/lib/logger';

// Force dynamic rendering - prevents build-time evaluation of Genkit imports
export const dynamic = 'force-dynamic';

interface GenerateCarouselRequest {
  brandId: string;
  prompt: string;
  slideCount: number;
  tier?: 'free' | 'paid';
  brandName?: string;
  primaryColor?: string;
}

interface CarouselSlide {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  ctaText?: string;
  ctaLink?: string;
  image?: string;
  backgroundColor?: string;
}

// Color palette for slides
const slideColors = [
  '#16a34a', // Green
  '#8b5cf6', // Purple
  '#dc2626', // Red
  '#1a1a2e', // Dark
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#6366f1', // Indigo
];

export async function POST(request: NextRequest) {
  try {
    const body: GenerateCarouselRequest = await request.json();
    const { brandId, prompt, slideCount, tier = 'free', brandName = 'Your Brand', primaryColor } = body;

    if (!prompt || !brandId) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, brandId' },
        { status: 400 }
      );
    }

    if (slideCount < 2 || slideCount > 5) {
      return NextResponse.json(
        { error: 'slideCount must be between 2 and 5' },
        { status: 400 }
      );
    }

    logger.info('[generate-carousel] Starting generation', {
      brandId,
      slideCount,
      tier,
      promptLength: prompt.length,
    });

    // Select model based on tier
    const model = tier === 'paid'
      ? 'googleai/gemini-2.5-flash' // Upgraded to Gemini 2.5 Flash
      : 'googleai/gemini-2.5-flash';

    // Generate all slides in one call for consistency
    const result = await ai.generate({
      model,
      prompt: `You are a creative marketing expert for cannabis/hemp e-commerce brands.

Generate ${slideCount} homepage carousel slides for "${brandName}".

Campaign theme: ${prompt}

For each slide, create:
1. title: Bold headline (3-6 words, can use ALL CAPS for emphasis)
2. subtitle: Short tagline above title (2-4 words)
3. description: One engaging sentence describing the offer or vibe
4. ctaText: Button text (2-3 words like "Shop Now", "Learn More", "Get Started")
5. ctaLink: Default to "#products" for shop links

Guidelines:
- Be creative and on-brand
- No health claims (compliance requirement)
- Vary the messaging style across slides
- First slide should be the main hook
- Include promotional language where appropriate
- Make it exciting and conversion-focused

Return valid JSON array of ${slideCount} slides with this exact structure:
[
  {
    "title": "...",
    "subtitle": "...",
    "description": "...",
    "ctaText": "...",
    "ctaLink": "#products"
  }
]

Return ONLY the JSON array, no other text.`,
      output: { format: 'json' },
    });

    // Parse the response
    let slidesData: Array<{
      title: string;
      subtitle?: string;
      description?: string;
      ctaText?: string;
      ctaLink?: string;
    }>;

    try {
      const output = result.output;
      if (Array.isArray(output)) {
        slidesData = output;
      } else if (typeof output === 'string') {
        slidesData = JSON.parse(output);
      } else {
        throw new Error('Unexpected output format');
      }
    } catch (parseError) {
      logger.error('[generate-carousel] Failed to parse AI response', {
        error: parseError,
        rawOutput: result.output,
      });
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Build final slides with IDs and colors
    const slides: CarouselSlide[] = slidesData.map((slide, index) => ({
      id: `slide-${index + 1}-${Date.now()}`,
      title: slide.title || `Slide ${index + 1}`,
      subtitle: slide.subtitle,
      description: slide.description,
      ctaText: slide.ctaText || 'Shop Now',
      ctaLink: slide.ctaLink || '#products',
      backgroundColor: primaryColor || slideColors[index % slideColors.length],
    }));

    logger.info('[generate-carousel] Generation complete', {
      brandId,
      slideCount: slides.length,
    });

    return NextResponse.json({ slides });
  } catch (error) {
    logger.error('[generate-carousel] Error generating carousel', { error });
    return NextResponse.json(
      { error: 'Failed to generate carousel' },
      { status: 500 }
    );
  }
}
