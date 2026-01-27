/**
 * Linus Fix API - Triggers Linus to analyze and fix issues
 *
 * This endpoint allows Linus to be triggered to fix bugs, run tests,
 * and interact with the codebase using Claude Code-like capabilities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { verifySuperAdmin } from '@/server/utils/auth-check';
import { runAgentChat } from '@/app/dashboard/ceo/agents/actions';
import { z } from 'zod';

// Force dynamic rendering - prevents build-time evaluation of agent dependencies
export const dynamic = 'force-dynamic';

const linusFixSchema = z.object({
    // Type of fix request
    type: z.enum(['ticket', 'test_failure', 'health_check', 'browser_test', 'code_review']),

    // For ticket-based fixes
    ticketId: z.string().optional(),
    errorStack: z.string().optional(),
    errorMessage: z.string().optional(),

    // For test failures
    testFile: z.string().optional(),
    testOutput: z.string().optional(),

    // For browser tests
    testUrl: z.string().optional(),
    testScenario: z.string().optional(),

    // For code review
    files: z.array(z.string()).optional(),
    prNumber: z.number().optional(),

    // General context
    context: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),

    // Options
    autoFix: z.boolean().default(false),
    runTests: z.boolean().default(true),
    useExtension: z.boolean().default(false),
});

type LinusFixRequest = z.infer<typeof linusFixSchema>;

export async function POST(request: NextRequest) {
    try {
        // Verify super user access
        if (!await verifySuperAdmin(request)) {
            return NextResponse.json({ error: 'Unauthorized - Super User required' }, { status: 401 });
        }

        const body = await request.json();
        const validation = linusFixSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid request', details: validation.error }, { status: 400 });
        }

        const data = validation.data;
        const prompt = buildLinusPrompt(data);

        logger.info('[Linus Fix API] Dispatching fix request', {
            type: data.type,
            priority: data.priority,
            autoFix: data.autoFix
        });

        // Dispatch to Linus
        const result = await runAgentChat(prompt, 'linus', {
            source: 'api_fix',
            priority: data.priority,
            modelLevel: data.priority === 'critical' ? 'genius' : 'standard'
        });

        return NextResponse.json({
            success: true,
            jobId: result.metadata?.jobId,
            message: `Linus fix job dispatched for ${data.type}`,
            type: data.type,
            priority: data.priority
        });

    } catch (error) {
        logger.error('[Linus Fix API] Error', { error });
        return NextResponse.json({ error: 'Failed to dispatch fix request' }, { status: 500 });
    }
}

function buildLinusPrompt(data: LinusFixRequest): string {
    const parts: string[] = [];

    parts.push(`=== LINUS FIX REQUEST ===`);
    parts.push(`Type: ${data.type.toUpperCase()}`);
    parts.push(`Priority: ${data.priority.toUpperCase()}`);
    parts.push(`Auto-Fix: ${data.autoFix ? 'ENABLED' : 'DISABLED'}`);
    parts.push(`Run Tests: ${data.runTests ? 'YES' : 'NO'}`);
    parts.push('');

    switch (data.type) {
        case 'ticket':
            parts.push('## TICKET FIX REQUEST');
            if (data.ticketId) parts.push(`Ticket ID: ${data.ticketId}`);
            if (data.errorMessage) parts.push(`Error: ${data.errorMessage}`);
            if (data.errorStack) {
                parts.push('');
                parts.push('Stack Trace:');
                parts.push('```');
                parts.push(data.errorStack);
                parts.push('```');
            }
            parts.push('');
            parts.push('DIRECTIVE:');
            parts.push('1. Analyze the error stack trace');
            parts.push('2. Search the codebase for the affected file/function');
            parts.push('3. Identify the root cause');
            if (data.autoFix) {
                parts.push('4. Write a fix for the issue');
                parts.push('5. Run tests to verify the fix');
                parts.push('6. Create a commit with the fix');
            } else {
                parts.push('4. Propose a fix (do NOT write code yet)');
                parts.push('5. Report findings');
            }
            break;

        case 'test_failure':
            parts.push('## TEST FAILURE INVESTIGATION');
            if (data.testFile) parts.push(`Test File: ${data.testFile}`);
            if (data.testOutput) {
                parts.push('');
                parts.push('Test Output:');
                parts.push('```');
                parts.push(data.testOutput.slice(0, 5000));
                parts.push('```');
            }
            parts.push('');
            parts.push('DIRECTIVE:');
            parts.push('1. Analyze the test failure output');
            parts.push('2. Identify what is failing and why');
            parts.push('3. Check if it is a test issue or code issue');
            if (data.autoFix) {
                parts.push('4. Fix the underlying issue');
                parts.push('5. Re-run the specific test to verify');
            } else {
                parts.push('4. Report the root cause and proposed fix');
            }
            break;

        case 'health_check':
            parts.push('## CODEBASE HEALTH CHECK');
            parts.push('');
            parts.push('DIRECTIVE:');
            parts.push('1. Run health check (build, tests, lint)');
            parts.push('2. Check for any TypeScript errors');
            parts.push('3. Review any failing tests');
            parts.push('4. Check for security vulnerabilities (npm audit)');
            parts.push('5. Report overall health status to boardroom');
            if (data.autoFix) {
                parts.push('6. Fix any critical issues found');
            }
            break;

        case 'browser_test':
            parts.push('## BROWSER TEST REQUEST');
            if (data.testUrl) parts.push(`URL: ${data.testUrl}`);
            if (data.testScenario) parts.push(`Scenario: ${data.testScenario}`);
            parts.push('');
            parts.push('DIRECTIVE:');
            if (data.useExtension) {
                parts.push('1. Use the BakedBot Chrome Extension for testing');
                parts.push('2. Create a browser session via /api/browser/session');
                parts.push('3. Navigate to the test URL');
                parts.push('4. Execute the test scenario');
                parts.push('5. Take screenshots of key states');
                parts.push('6. Check console for errors');
                parts.push('7. Report test results');
            } else {
                parts.push('1. Use Playwright/KushoAI for browser testing');
                parts.push('2. Run the specified test scenario');
                parts.push('3. Capture any failures');
                parts.push('4. Report results');
            }
            break;

        case 'code_review':
            parts.push('## CODE REVIEW REQUEST');
            if (data.files && data.files.length > 0) {
                parts.push(`Files to review: ${data.files.join(', ')}`);
            }
            if (data.prNumber) parts.push(`PR Number: #${data.prNumber}`);
            parts.push('');
            parts.push('DIRECTIVE:');
            parts.push('1. Read the specified files');
            parts.push('2. Check for TypeScript errors');
            parts.push('3. Review code quality and patterns');
            parts.push('4. Check for security issues');
            parts.push('5. Verify tests exist');
            parts.push('6. Provide code review feedback');
            break;
    }

    if (data.context) {
        parts.push('');
        parts.push('## Additional Context');
        parts.push(data.context);
    }

    return parts.join('\n');
}

// GET endpoint to check Linus status
export async function GET(request: NextRequest) {
    try {
        if (!await verifySuperAdmin(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Return Linus capabilities and status
        return NextResponse.json({
            agent: 'linus',
            role: 'CTO',
            status: 'online',
            capabilities: {
                ticketFix: true,
                testInvestigation: true,
                healthCheck: true,
                browserTest: true,
                codeReview: true,
                autoFix: true,
                kushoAi: !!process.env.KUSHO_API_KEY,
                chromeExtension: true
            },
            tools: [
                'search_codebase',
                'read_file',
                'write_file',
                'run_command',
                'run_specific_test',
                'run_browser_test',
                'kusho_generate_tests',
                'kusho_run_suite',
                'kusho_record_ui',
                'archive_work',
                'query_work_history',
                'browse_web',
                'extension_test'
            ]
        });

    } catch (error) {
        logger.error('[Linus Fix API] Status check failed', { error });
        return NextResponse.json({ error: 'Status check failed' }, { status: 500 });
    }
}
