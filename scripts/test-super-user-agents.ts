/**
 * Super User Agents CLI Test Script
 *
 * Tests all Super User agents by sending prompts and logging responses.
 * Run with: npx tsx scripts/test-super-user-agents.ts
 *
 * Options:
 *   --agent <name>     Test a specific agent (leo, jack, linus, etc.)
 *   --all              Test all agents
 *   --verbose          Show full response including tool calls
 *   --quick            Use shorter test prompts
 */

import { runAgentCore } from '@/server/agents/agent-runner';
import { DecodedIdToken } from 'firebase-admin/auth';
import { THREAD_AGENT_MAPPING, InboxThreadType } from '@/types/inbox';

// ============ Test Configuration ============

interface AgentTest {
    agent: string;
    threadType: InboxThreadType;
    prompt: string;
    expectedCapabilities: string[];
}

const SUPER_USER_TESTS: AgentTest[] = [
    // Executive Team
    {
        agent: 'leo',
        threadType: 'daily_standup',
        prompt: 'Run our daily standup. Give me a quick status: What shipped? What\'s blocked? What\'s priority today?',
        expectedCapabilities: ['coordination', 'status', 'operations'],
    },
    {
        agent: 'leo',
        threadType: 'weekly_sync',
        prompt: 'Gather updates for our executive weekly sync. What should we discuss?',
        expectedCapabilities: ['executive', 'sync', 'cross-functional'],
    },
    {
        agent: 'jack',
        threadType: 'customer_feedback',
        prompt: 'Customer pulse check: Any churn risks? Expansion opportunities? Recent feedback?',
        expectedCapabilities: ['customer', 'churn', 'revenue'],
    },
    {
        agent: 'jack',
        threadType: 'pipeline',
        prompt: 'Review our sales pipeline. What deals are closest to closing?',
        expectedCapabilities: ['pipeline', 'deals', 'revenue'],
    },
    {
        agent: 'linus',
        threadType: 'sprint_planning',
        prompt: 'Plan the next sprint. What\'s in backlog? How should we prioritize?',
        expectedCapabilities: ['sprint', 'backlog', 'prioritize'],
    },
    {
        agent: 'linus',
        threadType: 'incident_response',
        prompt: 'Production issue: Users report slow load times. Investigate root cause.',
        expectedCapabilities: ['incident', 'debug', 'performance'],
    },
    {
        agent: 'linus',
        threadType: 'release',
        prompt: 'Prepare for our next release. What\'s ready? What needs testing?',
        expectedCapabilities: ['release', 'testing', 'deployment'],
    },
    {
        agent: 'glenda',
        threadType: 'content_calendar',
        prompt: 'Plan content for next week. What topics should we cover?',
        expectedCapabilities: ['content', 'marketing', 'schedule'],
    },
    {
        agent: 'mike_exec',
        threadType: 'budget_planning',
        prompt: 'Cash flow review: Current burn rate, runway, and any concerns.',
        expectedCapabilities: ['cash', 'burn', 'runway'],
    },
    {
        agent: 'mike_exec',
        threadType: 'board_prep',
        prompt: 'Draft our monthly investor update. Key metrics and highlights.',
        expectedCapabilities: ['investor', 'metrics', 'board'],
    },

    // Support Staff
    {
        agent: 'mrs_parker',
        threadType: 'customer_onboarding',
        prompt: 'Review onboarding: Who signed up this week? What welcome emails went out?',
        expectedCapabilities: ['onboarding', 'welcome', 'customer'],
    },
    {
        agent: 'bigworm',
        threadType: 'deep_research',
        prompt: 'Research cannabis SaaS market: Key players, pricing models, market size.',
        expectedCapabilities: ['research', 'market', 'analysis'],
    },
    {
        agent: 'deebo',
        threadType: 'compliance_audit',
        prompt: 'Run compliance audit: SOC2 status, privacy concerns, cannabis regs.',
        expectedCapabilities: ['compliance', 'audit', 'regulations'],
    },
    {
        agent: 'day_day',
        threadType: 'seo_sprint',
        prompt: 'SEO audit: What pages need optimization? Target keywords?',
        expectedCapabilities: ['seo', 'optimization', 'keywords'],
    },
];

const QUICK_TESTS: AgentTest[] = [
    { agent: 'leo', threadType: 'daily_standup', prompt: 'Quick standup status?', expectedCapabilities: [] },
    { agent: 'jack', threadType: 'pipeline', prompt: 'Pipeline summary?', expectedCapabilities: [] },
    { agent: 'linus', threadType: 'sprint_planning', prompt: 'Sprint priorities?', expectedCapabilities: [] },
    { agent: 'glenda', threadType: 'content_calendar', prompt: 'Content ideas?', expectedCapabilities: [] },
    { agent: 'mike_exec', threadType: 'budget_planning', prompt: 'Cash position?', expectedCapabilities: [] },
];

// ============ Test Runner ============

interface TestResult {
    agent: string;
    threadType: string;
    prompt: string;
    success: boolean;
    responsePreview: string;
    toolCalls: string[];
    durationMs: number;
    error?: string;
}

async function runAgentTest(test: AgentTest, mockUser: DecodedIdToken, verbose: boolean): Promise<TestResult> {
    const startTime = Date.now();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🤖 Testing: ${test.agent.toUpperCase()} (${test.threadType})`);
    console.log(`📝 Prompt: "${test.prompt}"`);
    console.log(`${'='.repeat(60)}`);

    try {
        const result = await runAgentCore(
            test.prompt,
            test.agent,
            { modelLevel: 'standard' },
            mockUser,
            `test-${test.agent}-${Date.now()}`
        );

        const durationMs = Date.now() - startTime;
        const content = typeof result.content === 'string'
            ? result.content
            : JSON.stringify(result.content, null, 2);

        const toolCalls = result.toolCalls?.map(tc => `${tc.name}: ${tc.status}`) || [];

        // Print response
        console.log(`\n✅ Response (${durationMs}ms):`);
        console.log('-'.repeat(40));

        if (verbose) {
            console.log(content);
            if (toolCalls.length > 0) {
                console.log('\n🔧 Tool Calls:');
                toolCalls.forEach(tc => console.log(`  - ${tc}`));
            }
        } else {
            // Show preview (first 500 chars)
            const preview = content.length > 500 ? content.substring(0, 500) + '...' : content;
            console.log(preview);
        }

        return {
            agent: test.agent,
            threadType: test.threadType,
            prompt: test.prompt,
            success: true,
            responsePreview: content.substring(0, 200),
            toolCalls,
            durationMs,
        };

    } catch (error: any) {
        const durationMs = Date.now() - startTime;
        console.log(`\n❌ Error (${durationMs}ms): ${error.message}`);

        return {
            agent: test.agent,
            threadType: test.threadType,
            prompt: test.prompt,
            success: false,
            responsePreview: '',
            toolCalls: [],
            durationMs,
            error: error.message,
        };
    }
}

async function main() {
    const args = process.argv.slice(2);
    const verbose = args.includes('--verbose') || args.includes('-v');
    const quick = args.includes('--quick') || args.includes('-q');
    const testAll = args.includes('--all') || args.includes('-a');
    const agentFilter = args.find(a => a.startsWith('--agent='))?.split('=')[1];

    console.log('🧪 Super User Agents Test Suite');
    console.log('================================\n');

    // Mock Super User Context
    const mockUser: DecodedIdToken = {
        uid: 'test-super-user',
        email: 'ceo@bakedbot.ai',
        email_verified: true,
        role: 'super_user',
        brandId: 'bakedbot-internal',
        auth_time: Date.now(),
        iat: Date.now(),
        exp: Date.now() + 3600,
        aud: 'bakedbot',
        iss: 'https://securetoken.google.com/bakedbot',
        sub: 'test-super-user',
        firebase: { identities: {}, sign_in_provider: 'custom' }
    };

    console.log('👤 Context: Super User (CEO)');
    console.log(`⚙️  Mode: ${quick ? 'Quick' : 'Full'} | Verbose: ${verbose}`);

    // Select tests
    let tests = quick ? QUICK_TESTS : SUPER_USER_TESTS;

    if (agentFilter) {
        tests = tests.filter(t => t.agent === agentFilter);
        console.log(`🎯 Filtering to agent: ${agentFilter}`);
    }

    if (!testAll && !agentFilter) {
        // Default: test one agent from each category
        const defaultAgents = ['leo', 'linus', 'mrs_parker'];
        tests = tests.filter(t => defaultAgents.includes(t.agent));
        console.log('📋 Running default subset (leo, linus, mrs_parker)');
        console.log('   Use --all for complete test suite');
    }

    console.log(`\n📊 Running ${tests.length} test(s)...\n`);

    // Run tests
    const results: TestResult[] = [];
    for (const test of tests) {
        const result = await runAgentTest(test, mockUser, verbose);
        results.push(result);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalTime = results.reduce((sum, r) => sum + r.durationMs, 0);

    console.log(`\n✅ Passed: ${passed}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);
    console.log(`⏱️  Total Time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`📈 Avg Response: ${(totalTime / results.length / 1000).toFixed(2)}s`);

    if (failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`  - ${r.agent} (${r.threadType}): ${r.error}`);
        });
    }

    // Agent routing verification
    console.log('\n🔗 Agent Routing Verification:');
    results.forEach(r => {
        const expectedAgent = THREAD_AGENT_MAPPING[r.threadType as InboxThreadType]?.primary;
        const match = r.agent === expectedAgent ||
                      (r.agent === 'mike_exec' && expectedAgent === 'mike') ||
                      (r.agent === 'bigworm' && expectedAgent === 'big_worm');
        console.log(`  ${match ? '✓' : '✗'} ${r.threadType} → ${r.agent} (expected: ${expectedAgent})`);
    });

    console.log('\n✨ Test suite complete.\n');
}

main().catch(console.error);
