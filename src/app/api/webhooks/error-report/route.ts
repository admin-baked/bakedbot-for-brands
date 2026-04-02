import { NextRequest, NextResponse } from 'next/server';
import { runAgentChat } from '@/app/dashboard/ceo/agents/actions';
import { logger } from '@/lib/logger';
import { sanitizeForPrompt, wrapUserData, buildSystemDirectives } from '@/server/security';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    // 1. Authorization (Use same CRON_SECRET for simplicity, or a dedicated WEBHOOK_SECRET)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        logger.error('[Interrupt] CRON_SECRET environment variable is not configured');
        return new NextResponse('Server misconfiguration', { status: 500 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { error, stack, context } = body;

        if (!error) {
            return NextResponse.json({ success: false, error: 'Missing error details' }, { status: 400 });
        }

        logger.info('[Interrupt] Error Reported', { error: String(error).slice(0, 200) });

        // SECURITY: Build structured prompt with sanitized user data
        const directives = buildSystemDirectives([
            '[IMMEDIATE ACTION] Send an email to \'martez@bakedbot.ai\' with subject "🚨 Linus Activated: Investigating Error" and the error summary.',
            'Analyze the stack trace (use analyze_stack_trace if needed).',
            'Locate the file and line number.',
            'If the fix is obvious and safe, create a patch.',
            'Report your diagnostic.',
            '[FINAL ACTION] Send an email to \'martez@bakedbot.ai\' with subject "✅ Error Resolved" (or "⚠️ Investigation Update") and your summary.'
        ]);

        // 2. Construct the "Interrupt" Prompt for Linus
        const prompt = `CRITICAL INTERRUPT: A production error has been reported.

${wrapUserData(String(error), 'error', true, 500)}

${wrapUserData(String(stack || 'No stack trace provided'), 'stack_trace', true, 2000)}

${wrapUserData(JSON.stringify(context || {}), 'context', true, 1000)}

${directives}`;

        // 3. Dispatch to Linus (The "Interrupt")
        // We use source: 'interrupt' to signal urgency
        const result = await runAgentChat(prompt, 'linus', { source: 'interrupt', priority: 'high' });

        return NextResponse.json({
            success: true,
            message: 'Linus dispatched',
            agentResponse: result
        });

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Internal Server Error';
        logger.error('[Interrupt] Failed to dispatch', { error: message });
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
