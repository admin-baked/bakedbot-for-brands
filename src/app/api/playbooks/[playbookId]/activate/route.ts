import { NextRequest, NextResponse } from 'next/server';
import { PlaybookApiError, getAuthorizedPlaybook } from '@/server/services/playbook-auth';

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ playbookId: string }> },
) {
    try {
        const { playbookId } = await params;
        const { ref } = await getAuthorizedPlaybook(playbookId);

        await ref.update({
            status: 'active',
            active: true,
            updatedAt: new Date(),
        });

        return NextResponse.json({ success: true, playbookId, status: 'active' });
    } catch (error) {
        if (error instanceof PlaybookApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error('[API] Playbook activate error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
