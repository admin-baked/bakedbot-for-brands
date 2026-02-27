/**
 * Pinky — QA Engineering Director
 *
 * BakedBot's dedicated QA agent. Meticulous, thorough, nothing slips past her.
 * Tracks bugs, verifies fixes, runs smoke tests, and owns overall quality.
 *
 * Tools:
 * - report_bug              — file a new bug with full reproduction details
 * - update_bug_status       — transition bug through lifecycle states
 * - assign_bug              — route a bug to linus, deebo, or another agent
 * - verify_fix              — re-test a fix and mark verified
 * - list_open_bugs          — query bugs with filters
 * - get_bug_detail          — fetch a single bug by ID (full details)
 * - check_regression_history — check if an area has chronic failures
 * - get_test_cases          — list test cases from the living registry
 * - get_qa_report           — stats: open counts, coverage %, by area
 * - run_quick_smoke         — trigger smoke test suite, get pass/fail
 * - update_test_case        — mark a MASTER_MANUAL_TEST_PLAN entry as passed/failed
 * - generate_test_cases     — use Claude to generate test cases from a feature spec
 * - run_golden_set_eval     — run golden set regression eval for Smokey/Craig/Deebo
 * - intake_customer_bug     — read an inbox thread and extract + file a bug from it
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
                        'goals', 'customer_segments',
                        'greenledger', 'booking_calendar', 'livekit_meetings', 'x402_payments',
                        'other'
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
    },

    // ---- BUG DETAIL ----
    {
        name: 'get_bug_detail',
        description: 'Fetch the full details of a single bug by its Firestore ID. Use this to review a specific bug before verifying, closing, or escalating.',
        input_schema: {
            type: 'object' as const,
            properties: {
                bugId: {
                    type: 'string',
                    description: 'The Firestore document ID of the bug'
                }
            },
            required: ['bugId']
        }
    },

    // ---- REGRESSION HISTORY ----
    {
        name: 'check_regression_history',
        description: 'Check if a system area has a history of recurring bugs. Returns fixed/verified/closed bugs for the area, sorted most recent first. Use this before filing a new bug to detect regressions — a bug is a regression if the same area keeps breaking.',
        input_schema: {
            type: 'object' as const,
            properties: {
                area: {
                    type: 'string',
                    enum: [
                        'public_menu', 'compliance', 'auth', 'brand_guide', 'hero_carousel',
                        'bundle_system', 'revenue', 'redis_cache', 'competitive_intel',
                        'inbox', 'playbooks', 'creative_studio', 'drive', 'campaigns',
                        'pos_sync', 'cron_jobs', 'firebase_deploy', 'super_powers',
                        'goals', 'customer_segments',
                        'greenledger', 'booking_calendar', 'livekit_meetings', 'x402_payments',
                        'other'
                    ],
                    description: 'The system area to check for regression history'
                }
            },
            required: ['area']
        }
    },

    // ---- TEST CASE QUERY ----
    {
        name: 'get_test_cases',
        description: 'List test cases from the living registry (qa_test_cases). Use this to review coverage for a feature area or find untested/failing cases.',
        input_schema: {
            type: 'object' as const,
            properties: {
                area: {
                    type: 'string',
                    description: 'Filter by feature area name (matches the area field on test cases)'
                },
                status: {
                    type: 'string',
                    enum: ['untested', 'passed', 'failed', 'partial'],
                    description: 'Filter by test status'
                },
                limit: {
                    type: 'number',
                    description: 'Max results to return (default 50)'
                }
            },
            required: []
        }
    },

    // ---- AI TEST CASE GENERATION ----
    {
        name: 'generate_test_cases',
        description: 'Use Claude to generate structured test cases from a feature spec or description. Cases are written to qa_test_cases and returned here. Use when onboarding a new feature area or after a major refactor.',
        input_schema: {
            type: 'object' as const,
            properties: {
                featureName: {
                    type: 'string',
                    description: 'Short name for the feature (e.g., "GreenLedger Advance Deposit Detection")'
                },
                specContent: {
                    type: 'string',
                    description: 'The feature spec, user story, or description to generate tests from. Can be prose, bullet points, or a spec doc excerpt.'
                },
                area: {
                    type: 'string',
                    enum: [
                        'public_menu', 'compliance', 'auth', 'brand_guide', 'hero_carousel',
                        'bundle_system', 'revenue', 'redis_cache', 'competitive_intel',
                        'inbox', 'playbooks', 'creative_studio', 'drive', 'campaigns',
                        'pos_sync', 'cron_jobs', 'firebase_deploy', 'super_powers',
                        'goals', 'customer_segments',
                        'greenledger', 'booking_calendar', 'livekit_meetings', 'x402_payments',
                        'other'
                    ],
                    description: 'The system area these test cases belong to'
                },
                count: {
                    type: 'number',
                    description: 'How many test cases to generate (default 10, max 20)'
                }
            },
            required: ['featureName', 'specContent', 'area']
        }
    },

    // ---- GOLDEN SET EVAL ----
    {
        name: 'run_golden_set_eval',
        description: 'Run the golden set regression eval for a specific AI agent (smokey, craig, or deebo). FAST tier runs deterministic regex/function checks instantly (free). FULL tier calls Claude Haiku for semantic checks (~$0.05-0.15). Use before releases or after agent prompt changes. A compliance failure (exit code 1) means a critical test failed — escalate immediately.',
        input_schema: {
            type: 'object' as const,
            properties: {
                agent: {
                    type: 'string',
                    enum: ['smokey', 'craig', 'deebo'],
                    description: 'Which agent to evaluate'
                },
                tier: {
                    type: 'string',
                    enum: ['fast', 'full'],
                    description: 'fast = deterministic checks only (default, free). full = includes LLM semantic checks (~$0.10 per run).'
                }
            },
            required: ['agent']
        }
    },

    // ---- CUSTOMER BUG INTAKE ----
    {
        name: 'intake_customer_bug',
        description: 'Read a customer inbox thread and extract a bug report from it. Pinky will analyze the conversation, identify the issue, and file a properly structured bug. Use when a customer reports a problem through the BakedBot inbox and you want to officially track it.',
        input_schema: {
            type: 'object' as const,
            properties: {
                threadId: {
                    type: 'string',
                    description: 'The Firestore document ID of the inbox thread containing the customer bug report'
                },
                priority: {
                    type: 'string',
                    enum: ['P0', 'P1', 'P2', 'P3'],
                    description: 'Override priority (optional — Pinky will infer from conversation if not provided)'
                }
            },
            required: ['threadId']
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

        case 'get_bug_detail': {
            const { getBugById } = await import('@/server/actions/qa');
            const bug = await getBugById(input.bugId as string);
            if (!bug) return { found: false, error: `Bug ${input.bugId} not found` };
            return { found: true, bug };
        }

        case 'check_regression_history': {
            const { getRegressionHistory } = await import('@/server/actions/qa');
            const history = await getRegressionHistory(input.area as QABugArea);
            const regressionCount = history.length;
            const isChronicArea = regressionCount >= 3;
            return {
                area: input.area,
                previouslyFixedBugs: regressionCount,
                isChronicArea,
                riskWarning: isChronicArea
                    ? `⚠️ CHRONIC FAILURE AREA — ${regressionCount} previously-fixed bugs in ${input.area}. Mark new bug isRegression=true.`
                    : null,
                history: history.slice(0, 10).map(b => ({
                    id: b.id,
                    title: b.title,
                    status: b.status,
                    priority: b.priority,
                    commitFixed: b.commitFixed,
                })),
            };
        }

        case 'get_test_cases': {
            const { getTestCases } = await import('@/server/actions/qa');
            const cases = await getTestCases({
                area: input.area as string | undefined,
                status: input.status as QATestStatus | undefined,
                limit: (input.limit as number) || 50,
            });
            const passing = cases.filter(c => c.status === 'passed').length;
            const failing = cases.filter(c => c.status === 'failed').length;
            const untested = cases.filter(c => c.status === 'untested').length;
            return {
                total: cases.length,
                passing,
                failing,
                untested,
                coveragePct: cases.length > 0 ? Math.round((passing / cases.length) * 100) : 0,
                cases: cases.map(c => ({
                    id: c.id,
                    title: c.title,
                    area: c.area,
                    status: c.status,
                    priority: c.priority,
                    linkedBugId: c.linkedBugId,
                })),
            };
        }

        case 'generate_test_cases': {
            const { generateTestCasesFromSpec } = await import('@/server/actions/qa');
            const result = await generateTestCasesFromSpec({
                featureName: input.featureName as string,
                specContent: input.specContent as string,
                area: input.area as QABugArea,
                count: input.count as number | undefined,
            });
            if (!result.success) return result;
            return {
                success: true,
                generated: result.testCases?.length ?? 0,
                featureName: input.featureName,
                area: input.area,
                testCases: result.testCases?.map(c => ({ id: c.id, title: c.title, priority: c.priority })),
                message: `Generated ${result.testCases?.length ?? 0} test cases for "${input.featureName}" — all written to qa_test_cases collection.`,
            };
        }

        case 'run_golden_set_eval': {
            const agent = (input.agent as string) || 'deebo';
            const tier = (input.tier as string) || 'fast';
            const cronSecret = process.env.CRON_SECRET;

            if (!cronSecret) {
                return { success: false, error: 'CRON_SECRET not configured - cannot run golden set eval' };
            }

            const validAgents = new Set(['smokey', 'craig', 'deebo']);
            const validTiers = new Set(['fast', 'full']);
            if (!validAgents.has(agent)) {
                return { success: false, error: `Invalid agent: ${agent}` };
            }
            if (!validTiers.has(tier)) {
                return { success: false, error: `Invalid tier: ${tier}` };
            }

            try {
                const BASE_URL = process.env.NEXTAUTH_URL
                    || 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';

                const response = await fetch(`${BASE_URL}/api/cron/qa-golden-eval`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${cronSecret}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ agent, tier }),
                });

                if (!response.ok) {
                    let detail = '';
                    try {
                        const errorBody = await response.json();
                        if (errorBody?.error) detail = `: ${String(errorBody.error)}`;
                    } catch {
                        // ignore parse errors and return status-only message
                    }
                    return { success: false, error: `qa-golden-eval returned ${response.status}${detail}` };
                }

                const data = await response.json();
                if (
                    typeof data.score !== 'number'
                    || typeof data.passed !== 'number'
                    || typeof data.failed !== 'number'
                    || typeof data.total !== 'number'
                    || typeof data.threshold !== 'number'
                ) {
                    return { success: false, error: 'qa-golden-eval returned malformed payload' };
                }

                const complianceFailed = data.complianceFailed === true;
                const belowThreshold = data.belowThreshold === true;

                return {
                    agent,
                    tier,
                    score: data.score,
                    passed: data.passed,
                    failed: data.failed,
                    total: data.total,
                    threshold: data.threshold,
                    complianceFailed,
                    belowThreshold,
                    verdict: complianceFailed
                        ? 'COMPLIANCE FAILURE: critical test failed, block deployment'
                        : belowThreshold
                            ? `BELOW THRESHOLD: ${data.score}% < ${data.threshold}% minimum, investigate agent regression`
                            : `PASSING: ${data.score}% (${data.passed}/${data.total})`,
                    stdout: data.stdout,
                };
            } catch (error) {
                return { success: false, error: (error as Error).message };
            }
        }

        case 'intake_customer_bug': {
            const { getInboxThreadContent } = await import('@/server/actions/qa');
            const thread = await getInboxThreadContent(input.threadId as string);

            if (!thread.success) {
                return { success: false, error: thread.error };
            }

            // Return thread content — Pinky's LLM layer reads this and then calls report_bug
            return {
                success: true,
                threadId: input.threadId,
                orgId: thread.orgId,
                conversationContent: thread.content,
                instruction: 'Read the conversation above and extract a bug report. Call report_bug with: title (concise issue), steps (how to reproduce), expected (what should happen), actual (what the customer experienced), priority (infer from urgency/impact), area (which system is affected), affectedOrgId (the orgId from this result).',
                suggestedPriority: input.priority as string | undefined,
            };
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
- Generate test cases from specs so every new feature has coverage from day one
- Run golden set evals before releases to protect against AI agent regressions
- Intake customer bug reports from inbox threads — translate pain into precise tracker entries
- Report QA health clearly: open bugs by priority, test coverage percentage

WORKING WITH THE TEAM:
- Linus (CTO): Code fixes, TypeScript errors, deploy issues → assign bugs to "linus"
- Deebo (Compliance): Compliance violations, age gate issues → assign to "deebo"
- The CEO dashboard (tab=qa) shows all bugs and test coverage for Super Users
- Dispensary admins see only bugs affecting their org

BUG PRIORITY GUIDE:
- P0: Site is down / data loss / security breach — PAGE LINUS IMMEDIATELY
- P1: Critical customer-facing feature broken (menu doesn't load, auth fails, payments broken)
- P2: Degraded UX / non-critical feature broken / performance issue
- P3: Minor visual bug / cosmetic issue / low-priority improvement

REGRESSION DETECTION:
- Before filing a new bug, call check_regression_history for the same area
- If the area has 3+ previously-fixed bugs, mark it isRegression=true and call it out clearly
- Chronic areas (booking_calendar, brand_guide, public_menu) need extra scrutiny

VALID STATUS TRANSITIONS:
open → triaged → assigned → in_progress → fixed → verified → closed

A bug CANNOT jump from open → verified. It must go through the lifecycle.
wont_fix is terminal. closed is terminal. Only move bugs forward.

GOLDEN SET EVAL GUIDE:
- Use FAST tier for routine pre-deploy checks (deterministic, free, <5s)
- Use FULL tier after system prompt changes to any AI agent (costs ~$0.10, uses Claude Haiku)
- complianceFailed = true → DO NOT deploy, escalate to Linus + Deebo immediately
- belowThreshold = true → investigate regression, notify agent owner before releasing

TEST CASE GENERATION:
- Use generate_test_cases when a new feature ships with no test coverage
- Aim for a mix: 40% happy path, 40% edge cases, 20% failure/error scenarios
- Always include at least one compliance/security test case for any customer-facing feature

CUSTOMER BUG INTAKE:
- Call intake_customer_bug with the inbox threadId to extract a structured bug report
- Pinky reads the conversation and then calls report_bug with precise structured data
- Always link affectedOrgId from the thread's orgId field

OUTPUT FORMAT:
- Use markdown tables for bug lists
- Include bug IDs for all bugs you reference
- Always state priority with emoji (🔴 P0, 🟠 P1, 🟡 P2, 🟢 P3)
- When filing a bug, confirm: "Bug #[id] filed — [title] [priority emoji]"
- When verifying, confirm: "Bug #[id] VERIFIED ✅ — [brief test confirmation]"
- For golden set results: lead with the verdict emoji and score`;

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

