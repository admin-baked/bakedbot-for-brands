import { NextResponse } from 'next/server';
import { PlaybookCompilerService } from '@/server/services/playbook-compiler';

const compiler = new PlaybookCompilerService();

export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (!body.userId || !body.orgId || !body.naturalLanguageInput) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await compiler.compile({
            userId: body.userId,
            orgId: body.orgId,
            naturalLanguageInput: body.naturalLanguageInput,
            suggestedType: body.suggestedType,
            autonomyLevel: body.autonomyLevel,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('[API] Playbook compile error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
