/**
 * Pinky — QA Engineering Director
 *
 * BakedBot's dedicated QA agent. Meticulous, thorough, nothing slips past her.
 * Tracks bugs, verifies fixes, runs smoke tests, and owns overall quality.
 *
 * Tools:
 * - report_bug        — file a new bug with full reproduction details
 * - update_bug_status — transition bug through lifecycle states
 * - assign_bug        — route a bug to linus, deebo, or another agent
 * - verify_fix        — re-test a fix and mark verified
 * - list_open_bugs    — query bugs with filters
 * - get_qa_report     — stats: open counts, coverage %, by area
 * - run_quick_smoke   — trigger smoke test suite, get pass/fail
 * - update_test_case  — mark a MASTER_MANUAL_TEST_PLAN entry as passed/failed
 */

import { executeWithTools, isClaudeAvailable, ClaudeTool, ClaudeResult } from '@/ai/claude';
import { logger } from '@/lib/logger';
import type { QABugPriority, QABugArea, QABugStatus, QATestStatus } from '@/types/qa';

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const PINKY_TOOLS: ClaudeTool[] = [
    // ---- REPORTING ----
    {
        name: 'report_bug',
        description: 'File a new bug in the QA tracker. Be precise: provide exact steps to reproduce, expected behavior, actual behavior, and priority. Bugs are tracked in Firestore and trigger Slack notifications for P0/P1.',
        input_schema: {
            type: 'object' as const,
            properties: {
                title: {
                    type: 'string',
                    description: 'Concise bug title (e.g., "Hero carousel missing on /thrivesyracuse public menu")'
                },
                steps: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Step-by-step reproduction steps (numbered)'
                },
                expected: {
                    type: 'string',
                    description: 'What should happen'
                },
                actual: {
                    type: 'string',
                    description: 'What actually happens (the bug)'
                },
                priority: {
                    type: 'string',
                    enum: ['P0', 'P1', 'P2', 'P3'],
                    description: 'P0=site down/data loss, P1=critical feature broken, P2=degraded UX, P3=minor cosmetic'
                },
                area: {
                    type: 'string',
                    enum: [
                        'public_menu', 'compliance', 'auth', 'brand_guide', 'hero_carousel',
                        'bundle_system', 'revenue', 'redis_cache', 'competitive_intel',
                        'inbox', 'playbooks', 'creative_studio', 'drive', 'campaigns',
                        'pos_sync', 'cron_jobs', 'firebase_deploy', 'super_powers',
                        'goals', 'customer_segments', 'other'
                    ],
                    description: 'Dashboard area or system component affected'
                },
                affectedOrgId: {
                    type: 'string',
                    description: 'The orgId of the customer/org affected (e.g., org_thrive_syracuse). Leave empty for platform-level bugs.'
                },
                testCaseId: {
                    type: 'string',
                    description: 'Linked test case ID from MASTER_MANUAL_TEST_PLAN (e.g., "1.1", "7.3")'
                },
                environment: {
                    type: 'string',
                    enum: ['production', 'staging', 'local'],
                    description: 'Where the bug was observed'
                },
                notes: {
                    type: 'string',
                    description: 'Additional context, workarounds, or investigation notes'
                }
            },
            required: ['title', 'steps', 'expected', 'actual', 'priority', 'area']
        }
    },

    // ---- STATUS TRANSITIONS ----
    {
        name: 'update_bug_status',
        description: 'Transition a bug to a new status. Validates allowed transitions. Use notes to explain the change.',
        input_schema: {
            type: 'object' as const,
            properties: {
                bugId: {
                    type: 'string',
                    description: 'The Firestore document ID of the bug'
                },
                status: {
                    type: 'string',
                    enum: ['open', 'triaged', 'assigned', 'in_progress', 'fixed', 'verified', 'closed', 'wont_fix'],
                    description: 'New status for the bug'
                },
                notes: {
                    type: 'string',
                    description: 'Reason for the status change or additional context'
                }
            },
            required: ['bugId', 'status']
        }
    },

    // ---- ASSIGNMENT ----
    {
        name: 'assign_bug',
        description: 'Assign a bug to an agent or team member. Use linus for code fixes, deebo for compliance issues.',
        input_schema: {
            type: 'object' as const,
            properties: {
                bugId: {
                    type: 'string',
                    description: 'The Firestore document ID of the bug'
                },
                assignedTo: {
                    type: 'string',
                    description: 'Agent or email to assign to (e.g., "linus", "deebo", "jack@bakedbot.ai")'
                }
            },
            required: ['bugId', 'assignedTo']
        }
    },

    // ---- VERIFICATION ----
    {
        name: 'verify_fix',
        description: 'Mark a fixed bug as verified after re-testing the fix. A bug is not closed until Pinky verifies it herself.',
        input_schema: {
            type: 'object' as const,
            properties: {
                bugId: {
                    type: 'string',
                    description: 'The Firestore document ID of the bug'
                },
                notes: {
                    type: 'string',
                    description: 'Verification notes — what was tested, how the fix was confirmed'
                },
                commitFixed: {
                    type: 'string',
                    description: 'The commit hash that fixed this bug (e.g., "abc123de")'
                }
            },
            required: ['bugId']
        }
    },

    // ---- QUERIES ----
    {
        name: 'list_open_bugs',
        description: 'Query the bug tracker. Returns bugs matching the filters. Defaults to all open bugs.',
        input_schema: {
            type: 'object' as const,
            properties: {
                status: {
                    type: 'string',
                    enum: ['open', 'triaged', 'assigned', 'in_progress', 'fixed', 'verified', 'closed', 'wont_fix'],
                    description: 'Filter by status (defaults to open/triaged/assigned/in_progress)'
                },
                priority: {
                    type: 'string',
                    enum: ['P0', 'P1', 'P2', 'P3'],
                    description: 'Filter by priority'
                },
                area: {
                    type: 'string',
                    description: 'Filter by system area'
                },
                orgId: {
                    type: 'string',
                    description: 'Filter by affected org ID'
                },
                assignedTo: {
                    type: 'string',
                    description: 'Filter by assignee (e.g., "linus")'
                },
                limit: {
                    type: 'number',
                    description: 'Max results to return (default 20)'
                }
            },
            required: []
        }
    },

    // ---- REPORTING ----
    {
        name: 'get_qa_report',
        description: 'Get a summary QA report: open bug counts by priority, test coverage percentage, and area breakdown.',
        input_schema: {
            type: 'object' as const,
            properties: {
                orgId: {
                    type: 'string',
                    description: 'Scope report to a specific org (optional — omit for platform-wide)'
                }
            },
            required: []
        }
    },

    // ---- SMOKE TESTS ----
    {
        name: 'run_quick_smoke',
        description: 'Trigger the QA smoke test suite. Runs ~20 API-level checks against production. Returns pass/fail count and details of any failures.',
        input_schema: {
            type: 'object' as const,
            properties: {
                environment: {
                    type: 'string',
                    enum: ['production', 'staging'],
                    description: 'Which environment to test against (default: production)'
                },
                fileBugsOnFailure: {
                    type: 'boolean',
                    description: 'If true, automatically files bugs for each failed test (default: false)'
                }
            },
            required: []
        }
    },

    // ---- TEST CASE REGISTRY ----
    {
        name: 'update_test_case',
        description: 'Update the status of a test case in the MASTER_MANUAL_TEST_PLAN registry (qa_test_cases collection).',
        input_schema: {
            type: 'object' as const,
            properties: {
                testCaseId: {
                    type: 'string',
                    description: 'Test case ID (e.g., "1.1", "7.3") from MASTER_MANUAL_TEST_PLAN'
                },
                status: {
                    type: 'string',
                    enum: ['untested', 'passed', 'failed', 'partial'],
                    description: 'New test status'
                },
                linkedBugId: {
                    type: 'string',
                    description: 'Bug ID to link if the test failed'
                }
            },
            required: ['testCaseId', 'status']
        }
    }
];

// ============================================================================
// TOOL EXECUTOR
// ============================================================================

async function pinkyToolExecutor(toolName: string, input: Record<string, unknown>): Promise<unknown> {
    switch (toolName) {

        case 'report_bug': {
            const { reportBug } = await import('@/server/actions/qa');
            const result = await reportBug({
                title: input.title as string,
                steps: (input.steps as string[]) || [],
                expected: input.expected as string,
                actual: input.actual as string,
                priority: input.priority as QABugPriority,
                area: input.area as QABugArea,
                environment: (input.environment as QABug['environment']) || 'production',
                affectedOrgId: input.affectedOrgId as string | undefined,
                testCaseId: input.testCaseId as string | undefined,
                notes: input.notes as string | undefined,
            });
            return result;
        }

        case 'update_bug_status': {
            const { updateBugStatus } = await import('@/server/actions/qa');
            return await updateBugStatus(
                input.bugId as string,
                input.status as QABugStatus,
                input.notes as string | undefined
            );
        }

        case 'assign_bug': {
            const { assignBug } = await import('@/server/actions/qa');
            return await assignBug(input.bugId as string, input.assignedTo as string);
        }

        case 'verify_fix': {
            const { verifyFix } = await import('@/server/actions/qa');
            return await verifyFix(
                input.bugId as string,
                input.notes as string | undefined,
                input.commitFixed as string | undefined
            );
        }

        case 'list_open_bugs': {
            const { getBugs } = await import('@/server/actions/qa');
            const bugs = await getBugs({
                status: input.status as QABugStatus | undefined,
                priority: input.priority as QABugPriority | undefined,
                area: input.area as QABugArea | undefined,
                orgId: input.orgId as string | undefined,
                assignedTo: input.assignedTo as string | undefined,
                limit: (input.limit as number) || 20,
            });

            // If no status filter, default to active statuses only
            const filtered = input.status
                ? bugs
                : bugs.filter(b => !['closed', 'wont_fix', 'verified'].includes(b.status));

            return {
                total: filtered.length,
                bugs: filtered.map(b => ({
                    id: b.id,
                    title: b.title,
                    priority: b.priority,
                    status: b.status,
                    area: b.area,
                    assignedTo: b.assignedTo,
                    affectedOrgId: b.affectedOrgId,
                    createdAt: b.createdAt,
                }))
            };
        }

        case 'get_qa_report': {
            const { getQAReport } = await import('@/server/actions/qa');
            const report = await getQAReport(input.orgId as string | undefined);
            return {
                summary: `${report.open} open bugs | ${report.testCoverage.coveragePct}% test coverage (${report.testCoverage.passing}/${report.testCoverage.total} passing)`,
                open: report.open,
                total: report.total,
                byPriority: report.byPriority,
                byStatus: report.byStatus,
                byArea: report.byArea,
                testCoverage: report.testCoverage,
                generatedAt: report.generatedAt.toISOString(),
            };
        }

        case 'run_quick_smoke': {
            // Call the internal smoke test endpoint
            const env = (input.environment as string) || 'production';
            const fileBugs = Boolean(input.fileBugsOnFailure);

            try {
                const BASE_URL = env === 'production'
                    ? 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app'
                    : 'http://localhost:3000';

                const cronSecret = process.env.CRON_SECRET;
                if (!cronSecret) {
                    return { success: false, error: 'CRON_SECRET not configured — cannot run smoke tests' };
                }

                const response = await fetch(`${BASE_URL}/api/cron/qa-smoke`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${cronSecret}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ fileBugsOnFailure: fileBugs }),
                });

                if (!response.ok) {
                    return { success: false, error: `Smoke test endpoint returned ${response.status}` };
                }

                const data = await response.json();
                return {
                    success: true,
                    passed: data.passed,
                    failed: data.failed,
                    total: data.total,
                    failedTests: data.results?.filter((r: any) => !r.passed) || [],
                    summary: `${data.passed}/${data.total} tests passing`,
                };
            } catch (error) {
                return { success: false, error: (error as Error).message };
            }
        }

        case 'update_test_case': {
            const { updateTestCaseStatus } = await import('@/server/actions/qa');
            return await updateTestCaseStatus(
                input.testCaseId as string,
                input.status as QATestStatus,
                input.linkedBugId as string | undefined
            );
        }

        default:
            logger.warn('[Pinky] Unknown tool called', { toolName });
            return { error: `Unknown tool: ${toolName}` };
    }
}

// ============================================================================
// TYPE HELPERS (needed inside executor)
// ============================================================================

type QABugEnv = 'production' | 'staging' | 'local';
interface QABug { environment: QABugEnv; }

// ============================================================================
// PINKY SYSTEM PROMPT
// ============================================================================

const PINKY_SYSTEM_PROMPT = `You are Pinky, BakedBot's QA Engineering Director.

You are meticulous, thorough, and nothing slips past you. You are professional, precise, and persistent.

YOUR MISSION:
- Track bugs with precision — exact steps, exact expected vs actual behavior
- Assign bugs to the right people (Linus for code fixes, Deebo for compliance issues)
- Verify every fix personally before closing — "fixed" doesn't mean "done" until YOU verify
- Maintain the test registry (qa_test_cases) as a living document
- Run smoke tests after every major deploy to catch regressions early
- Report QA health clearly: open bugs by priority, test coverage percentage

WORKING WITH THE TEAM:
- Linus (CTO): Code fixes, TypeScript errors, deploy issues → assign bugs to "linus"
- Deebo (Compliance): Compliance violations, age gate issues → assign to "deebo"
- The CEO dashboard (tab=qa) shows all bugs and test coverage for Super Users
- Dispensary admins see only bugs affecting their org

BUG PRIORITY GUIDE:
- P0: Site is down / data loss / security breach — PAGE LINUS IMMEDIATELY
- P1: Critical customer-facing feature broken (menu doesn't load, auth fails)
- P2: Degraded UX / non-critical feature broken / performance issue
- P3: Minor visual bug / cosmetic issue / low-priority improvement

VALID STATUS TRANSITIONS:
open → triaged → assigned → in_progress → fixed → verified → closed

A bug CANNOT jump from open → verified. It must go through the lifecycle.
wont_fix is terminal. closed is terminal. Only move bugs forward.

OUTPUT FORMAT:
- Use markdown tables for bug lists
- Include bug IDs for all bugs you reference
- Always state priority with emoji (🔴 P0, 🟠 P1, 🟡 P2, 🟢 P3)
- When filing a bug, confirm: "Bug #[id] filed — [title] [priority emoji]"
- When verifying, confirm: "Bug #[id] VERIFIED ✅ — [brief test confirmation]"`;

// ============================================================================
// PUBLIC API
// ============================================================================

export interface PinkyRequest {
    prompt: string;
    context?: {
        userId?: string;
        orgId?: string;
    };
    maxIterations?: number;
}

export interface PinkyResponse {
    content: string;
    toolExecutions: ClaudeResult['toolExecutions'];
    model: string;
}

export async function runPinky(request: PinkyRequest): Promise<PinkyResponse> {
    if (!isClaudeAvailable()) {
        throw new Error('Claude API is required for Pinky. Set CLAUDE_API_KEY environment variable.');
    }

    logger.info('[Pinky] Processing request', { promptLength: request.prompt.length });

    const contextNote = request.context?.orgId
        ? `\n\nContext: You are responding for org ${request.context.orgId}.`
        : '';

    const fullPrompt = `${PINKY_SYSTEM_PROMPT}${contextNote}\n\n---\n\nUser Request: ${request.prompt}`;

    const result = await executeWithTools(
        fullPrompt,
        PINKY_TOOLS,
        pinkyToolExecutor,
        {
            userId: request.context?.userId,
            maxIterations: request.maxIterations ?? 10,
        }
    );

    return {
        content: result.content,
        toolExecutions: result.toolExecutions,
        model: result.model,
    };
}

export { pinkyToolExecutor };
