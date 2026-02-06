/**
 * AI Hero Suggestion API Route
 *
 * Generates hero banner suggestions using Claude AI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/ai/claude';
import type { HeroAISuggestion, HeroStyle, HeroPurchaseModel, HeroCtaAction } from '@/types/heroes';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prompt, orgId, context } = body;

        if (!prompt || !orgId) {
            return NextResponse.json(
                { success: false, error: 'Prompt and orgId are required' },
                { status: 400 }
            );
        }

        // Build the AI prompt
        const systemPrompt = `You are a marketing expert specializing in cannabis brand hero banners.
Your task is to generate hero banner suggestions based on user requirements.

Hero banners appear at the top of brand and dispensary menu pages and should:
- Be attention-grabbing and professional
- Clearly communicate the brand's value proposition
- Include compelling calls-to-action
- Use appropriate colors that match the brand identity

Respond with a JSON object containing:
{
  "brandName": "Brand Name",
  "tagline": "A compelling tagline (under 50 chars)",
  "description": "A brief description (1-2 sentences)",
  "primaryColor": "#hex color code",
  "style": "default|minimal|bold|professional",
  "purchaseModel": "online_only|local_pickup|hybrid",
  "primaryCta": {
    "label": "Button text",
    "action": "find_near_me|shop_now|custom",
    "url": "optional URL if action is custom"
  },
  "secondaryCta": {
    "label": "Button text",
    "action": "find_near_me|shop_now|custom",
    "url": "optional URL"
  },
  "reasoning": "Brief explanation of your design choices"
}

Guidelines:
- Use green tones (#16a34a, #22c55e) for natural/organic brands
- Use purple/pink for premium/luxury brands
- Use bold style for edgy/modern brands
- Use professional style for medical dispensaries
- "find_near_me" CTA for local_pickup/hybrid models
- "shop_now" CTA for online_only models`;

        const userPrompt = `${prompt}${context ? `\n\nAdditional context: ${context}` : ''}`;

        const response = await callClaude({
            systemPrompt,
            userMessage: userPrompt,
            temperature: 0.7,
        });

        // Parse the AI response
        let suggestion: HeroAISuggestion;
        try {
            // Try to extract JSON from markdown code blocks
            const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            const jsonStr = jsonMatch ? jsonMatch[1] : response;
            suggestion = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
            return NextResponse.json(
                { success: false, error: 'Failed to parse AI response' },
                { status: 500 }
            );
        }

        // Validate the suggestion
        if (!suggestion.brandName || !suggestion.tagline) {
            return NextResponse.json(
                { success: false, error: 'Invalid AI response structure' },
                { status: 500 }
            );
        }

        // Ensure valid enum values
        const validStyles: HeroStyle[] = ['default', 'minimal', 'bold', 'professional'];
        const validPurchaseModels: HeroPurchaseModel[] = ['online_only', 'local_pickup', 'hybrid'];
        const validActions: HeroCtaAction[] = ['find_near_me', 'shop_now', 'custom'];

        if (!validStyles.includes(suggestion.style)) {
            suggestion.style = 'default';
        }
        if (!validPurchaseModels.includes(suggestion.purchaseModel)) {
            suggestion.purchaseModel = 'local_pickup';
        }
        if (!validActions.includes(suggestion.primaryCta.action)) {
            suggestion.primaryCta.action = 'shop_now';
        }

        return NextResponse.json({
            success: true,
            suggestion,
        });

    } catch (error) {
        console.error('Error generating hero suggestion:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate suggestion' },
            { status: 500 }
        );
    }
}
