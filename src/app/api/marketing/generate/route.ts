import { NextRequest, NextResponse } from 'next/server';
import { generateCampaignContent } from '@/ai/marketing-agent';
import { logger } from '@/lib/logger';
import { withProtection } from '@/server/middleware/with-protection';
import { z } from 'zod';

// Force dynamic rendering - prevents build-time evaluation of Genkit imports
export const dynamic = 'force-dynamic';

const generateSchema = z.object({
    goal: z.string().min(5),
    audience: z.string().optional(),
    tone: z.string().optional(),
    productContext: z.string().optional(),
});

export const POST = withProtection(
    async (req: NextRequest, data?: any) => {
        try {
            const body = await req.json();
            const validated = generateSchema.parse(body);

            const content = await generateCampaignContent(
                validated.goal,
                validated.audience,
                validated.tone,
                validated.productContext
            );

            return NextResponse.json({ ok: true, content });
        } catch (error) {
            logger.error('Failed to generate campaign', error instanceof Error ? error : new Error(String(error)));
            return NextResponse.json(
                { ok: false, error: 'Failed to generate campaign content' },
                { status: 500 }
            );
        }
    },
    {
        // No strict schema validation middleware here, we parse body manually simply
        // or we could extract schema to shared file but this is quick.
        csrf: true
    }
);
