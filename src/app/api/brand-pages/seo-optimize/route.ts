import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { ai } from '@/ai/genkit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface SeoOptimizeRequest {
    orgId: string;
    pageType: string;
    content: Record<string, unknown>;
    brandName: string;
    brandSlug: string;
}

interface SeoSuggestions {
    metaTitle: string;
    metaDescription: string;
    h1Suggestion: string;
    openingParagraph: string;
    keywords: string[];
    tips: string[];
}

export async function POST(req: NextRequest) {
    try {
        await requireUser(['brand', 'dispensary', 'super_user']);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: SeoOptimizeRequest;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { orgId, pageType, content, brandName, brandSlug } = body;
    if (!orgId || !pageType || !brandName) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Extract current page text from content object for context
    const currentText = extractText(content, pageType);

    const prompt = `You are an SEO expert specializing in cannabis dispensary websites. Analyze this dispensary's ${pageType} page and provide specific, actionable SEO improvements.

Dispensary: ${brandName}
Page type: ${pageType}
URL path: /${brandSlug}/${pageType === 'loyalty' ? 'rewards' : pageType}
Current content:
${currentText}

Return a JSON object with EXACTLY these fields:
{
  "metaTitle": "60 chars max — brand name + page type + location keyword",
  "metaDescription": "150-160 chars — compelling summary with local keywords, no cannabis slang",
  "h1Suggestion": "Clear, keyword-rich heading under 70 chars",
  "openingParagraph": "2-3 sentence intro that naturally includes 2-3 target keywords",
  "keywords": ["array", "of", "5-8", "target", "keywords"],
  "tips": ["array of 2-3 specific tips for improving this page's SEO"]
}

Rules:
- Use legal cannabis terminology (dispensary, cannabis, recreational, medical)
- Include city/state if identifiable from brand name
- Focus on local SEO (near me, city dispensary, local cannabis)
- Keep all text professional and compliant
- Return ONLY valid JSON, no markdown`;

    try {
        const response = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt,
            output: { format: 'json' },
        });

        const text = response.text ?? '';

        // Parse JSON from response
        let suggestions: SeoSuggestions;
        try {
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
            const parsed = JSON.parse(jsonStr.trim());
            suggestions = {
                metaTitle: String(parsed.metaTitle || `${brandName} | ${pageType.charAt(0).toUpperCase() + pageType.slice(1)}`),
                metaDescription: String(parsed.metaDescription || ''),
                h1Suggestion: String(parsed.h1Suggestion || ''),
                openingParagraph: String(parsed.openingParagraph || ''),
                keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : [],
                tips: Array.isArray(parsed.tips) ? parsed.tips.map(String) : [],
            };
        } catch {
            return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
        }

        logger.info('[seo-optimize] Generated SEO suggestions', { orgId, pageType });
        return NextResponse.json(suggestions);
    } catch (error) {
        logger.error('[seo-optimize] Gemini error', { error, orgId, pageType });
        return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
    }
}

function extractText(content: Record<string, unknown>, pageType: string): string {
    const parts: string[] = [];

    const push = (label: string, value: unknown) => {
        if (typeof value === 'string' && value.trim()) {
            parts.push(`${label}: ${value.trim()}`);
        }
    };

    switch (pageType) {
        case 'about': {
            const c = content.aboutContent as Record<string, unknown> | undefined;
            push('Heading', c?.heroTitle);
            push('Description', c?.heroDescription);
            push('Story', c?.story);
            push('Mission', c?.mission);
            break;
        }
        case 'loyalty': {
            const c = content.loyaltyContent as Record<string, unknown> | undefined;
            push('Heading', c?.heroTitle);
            push('Description', c?.heroDescription);
            const prog = c?.program as Record<string, unknown> | undefined;
            push('Program', prog?.name);
            push('Program description', prog?.description);
            break;
        }
        case 'locations': {
            const c = content.locationsContent as Record<string, unknown> | undefined;
            push('Heading', c?.heroTitle);
            push('Description', c?.heroDescription);
            break;
        }
        case 'careers': {
            const c = content.careersContent as Record<string, unknown> | undefined;
            push('Heading', c?.heroTitle);
            push('Description', c?.heroDescription);
            push('Culture', c?.culture);
            break;
        }
        default: {
            const keys = Object.keys(content);
            for (const key of keys.slice(0, 3)) {
                push(key, content[key]);
            }
        }
    }

    return parts.join('\n') || '(no current content)';
}
