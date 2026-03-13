import { NextRequest, NextResponse } from 'next/server';
import { PlaybookCompilerService } from '@/server/services/playbook-compiler';
import {
    PlaybookApiError,
    resolveRequestedOrgId,
} from '@/server/services/playbook-auth';

const compiler = new PlaybookCompilerService();

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const prompt =
            typeof body.prompt === 'string' && body.prompt.trim().length > 0
                ? body.prompt.trim()
                : typeof body.naturalLanguageInput === 'string'
                    ? body.naturalLanguageInput.trim()
                    : '';

        if (!prompt) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { user, orgId } = await resolveRequestedOrgId(body.orgId);

        const result = await compiler.compile({
            userId: user.uid,
            orgId,
            naturalLanguageInput: prompt,
            suggestedType: body.suggestedType,
            autonomyLevel: body.autonomyLevel,
        });

        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof PlaybookApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error('[API] Playbook compile error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
