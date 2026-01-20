
import { NextRequest, NextResponse } from 'next/server';
import { runAgentChat } from '@/app/dashboard/ceo/agents/actions';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    // 1. Authorization (Use same CRON_SECRET for simplicity, or a dedicated WEBHOOK_SECRET)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { error, stack, context } = body;

        if (!error) {
            return NextResponse.json({ success: false, error: 'Missing error details' }, { status: 400 });
        }

        console.log(`[Interrupt] Error Reported: ${error}`);

        // 2. Construct the "Interrupt" Prompt for Linus
        const prompt = `CRITICAL INTERRUPT: A production error has been reported.
        
ERROR: ${error}
STACK TRACE:
${stack || 'No stack trace provided'}

CONTEXT:
${JSON.stringify(context || {}, null, 2)}

DIRECTIVE:
1. [IMMEDIATE ACTION] Send an email to 'martez@bakedbot.ai' with subject "🚨 Linus Activated: Investigating Error" and the error summary.
2. Analyze the stack trace (use analyze_stack_trace if needed).
3. Locate the file and line number.
4. If the fix is obvious and safe, create a patch.
5. Report your diagnostic.
6. [FINAL ACTION] Send an email to 'martez@bakedbot.ai' with subject "✅ Error Resolved" (or "⚠️ Investigation Update") and your summary.`;

        // 3. Dispatch to Linus (The "Interrupt")
        // We use source: 'interrupt' to signal urgency
        const result = await runAgentChat(prompt, 'linus', { source: 'interrupt', priority: 'high' });

        return NextResponse.json({ 
            success: true, 
            message: 'Linus dispatched', 
            agentResponse: result 
        });

    } catch (e: any) {
        console.error('[Interrupt] Failed to dispatch:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
