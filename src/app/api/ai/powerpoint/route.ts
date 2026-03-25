import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { generatePowerPoint } from '@/ai/generators/powerpoint';
import type { DeckPurpose } from '@/types/powerpoint';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        await requireUser();

        const body = await request.json();
        const {
            topic,
            brandName,
            brandTagline,
            primaryColor,
            accentColor,
            logoUrl,
            purpose = 'pitch',
            slideCount,
            orgId,
        } = body as {
            topic: string;
            brandName?: string;
            brandTagline?: string;
            primaryColor?: string;
            accentColor?: string;
            logoUrl?: string;
            purpose?: DeckPurpose;
            slideCount?: number;
            orgId?: string;
        };

        if (!topic) {
            return NextResponse.json({ error: 'topic is required' }, { status: 400 });
        }

        const result = await generatePowerPoint({
            topic,
            brandName,
            brandTagline,
            primaryColor,
            accentColor,
            logoUrl,
            purpose,
            slideCount,
            orgId,
        });

        return NextResponse.json(result);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('[API/powerpoint] Generation failed', { error: msg });
        return NextResponse.json({ error: 'Deck generation failed' }, { status: 500 });
    }
}
