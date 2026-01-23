/**
 * Super User Agent Configuration Test
 *
 * Tests agent configuration and routing without requiring server context.
 * Run with: npx tsx scripts/test-agent-config.ts
 */

import { THREAD_AGENT_MAPPING, InboxThreadType, getThreadTypeLabel, getThreadTypeIcon, INBOX_QUICK_ACTIONS } from '../src/types/inbox';

// ============ Test Data ============

interface AgentTestCase {
    name: string;
    threadType: InboxThreadType;
    expectedPrimary: string;
    expectedSupporting: string[];
    samplePrompt: string;
}

const SUPER_USER_TEST_CASES: AgentTestCase[] = [
    // Executive Team
    {
        name: 'Leo (COO) - Daily Standup',
        threadType: 'daily_standup',
        expectedPrimary: 'leo',
        expectedSupporting: ['linus', 'jack', 'glenda'],
        samplePrompt: 'Run our daily standup. What shipped? What\'s blocked?',
    },
    {
        name: 'Leo (COO) - Weekly Sync',
        threadType: 'weekly_sync',
        expectedPrimary: 'leo',
        expectedSupporting: ['jack', 'linus', 'glenda', 'mike'],
        samplePrompt: 'Gather updates for our executive weekly sync.',
    },
    {
        name: 'Jack (CRO) - Pipeline',
        threadType: 'pipeline',
        expectedPrimary: 'jack',
        expectedSupporting: ['glenda', 'leo'],
        samplePrompt: 'Review our sales pipeline. What deals are closest?',
    },
    {
        name: 'Jack (CRO) - Customer Feedback',
        threadType: 'customer_feedback',
        expectedPrimary: 'jack',
        expectedSupporting: ['mrs_parker', 'linus'],
        samplePrompt: 'Customer pulse check: Any churn risks?',
    },
    {
        name: 'Linus (CTO) - Sprint Planning',
        threadType: 'sprint_planning',
        expectedPrimary: 'linus',
        expectedSupporting: ['leo', 'pops'],
        samplePrompt: 'Plan the next sprint. Backlog priorities?',
    },
    {
        name: 'Linus (CTO) - Incident Response',
        threadType: 'incident_response',
        expectedPrimary: 'linus',
        expectedSupporting: ['leo', 'deebo'],
        samplePrompt: 'Production issue: Users report slow load times.',
    },
    {
        name: 'Linus (CTO) - Release',
        threadType: 'release',
        expectedPrimary: 'linus',
        expectedSupporting: ['leo', 'craig'],
        samplePrompt: 'Prepare for release. What\'s ready?',
    },
    {
        name: 'Glenda (CMO) - Content Calendar',
        threadType: 'content_calendar',
        expectedPrimary: 'glenda',
        expectedSupporting: ['craig', 'day_day'],
        samplePrompt: 'Plan content for next week.',
    },
    {
        name: 'Mike (CFO) - Budget Planning',
        threadType: 'budget_planning',
        expectedPrimary: 'mike',
        expectedSupporting: ['leo', 'jack'],
        samplePrompt: 'Cash flow review: Burn rate and runway.',
    },
    {
        name: 'Mike (CFO) - Board Prep',
        threadType: 'board_prep',
        expectedPrimary: 'mike',
        expectedSupporting: ['jack', 'leo'],
        samplePrompt: 'Draft monthly investor update.',
    },

    // Support Staff
    {
        name: 'Mrs. Parker - Customer Onboarding',
        threadType: 'customer_onboarding',
        expectedPrimary: 'mrs_parker',
        expectedSupporting: ['jack', 'smokey'],
        samplePrompt: 'Review onboarding: Who signed up this week?',
    },
    {
        name: 'Big Worm - Deep Research',
        threadType: 'deep_research',
        expectedPrimary: 'big_worm',
        expectedSupporting: ['roach', 'ezal'],
        samplePrompt: 'Research cannabis SaaS market.',
    },
    {
        name: 'Roach - Compliance Research',
        threadType: 'compliance_research',
        expectedPrimary: 'roach',
        expectedSupporting: ['deebo', 'big_worm'],
        samplePrompt: 'Research California marketing compliance.',
    },
    {
        name: 'Deebo - Compliance Audit',
        threadType: 'compliance_audit',
        expectedPrimary: 'deebo',
        expectedSupporting: ['roach', 'leo'],
        samplePrompt: 'Run compliance audit: SOC2, privacy.',
    },
    {
        name: 'Day Day - SEO Sprint',
        threadType: 'seo_sprint',
        expectedPrimary: 'day_day',
        expectedSupporting: ['glenda', 'roach'],
        samplePrompt: 'SEO audit: What pages need optimization?',
    },
];

// ============ Test Runner ============

interface TestResult {
    name: string;
    passed: boolean;
    errors: string[];
}

function runTests(): TestResult[] {
    const results: TestResult[] = [];

    console.log('🧪 Super User Agent Configuration Tests');
    console.log('=' .repeat(60));
    console.log('');

    for (const testCase of SUPER_USER_TEST_CASES) {
        const errors: string[] = [];
        const mapping = THREAD_AGENT_MAPPING[testCase.threadType];

        console.log(`📋 ${testCase.name}`);
        console.log(`   Thread: ${testCase.threadType}`);
        console.log(`   Prompt: "${testCase.samplePrompt}"`);

        // Check primary agent
        if (!mapping) {
            errors.push(`No mapping found for thread type: ${testCase.threadType}`);
        } else {
            if (mapping.primary !== testCase.expectedPrimary) {
                errors.push(`Primary agent mismatch: expected ${testCase.expectedPrimary}, got ${mapping.primary}`);
            }

            // Check supporting agents
            for (const expected of testCase.expectedSupporting) {
                if (!mapping.supporting.includes(expected as any)) {
                    errors.push(`Missing supporting agent: ${expected}`);
                }
            }
        }

        // Check icon and label exist
        const icon = getThreadTypeIcon(testCase.threadType);
        const label = getThreadTypeLabel(testCase.threadType);

        if (icon === 'MessageSquare') {
            errors.push(`No custom icon for thread type (using default)`);
        }
        if (label === 'Unknown') {
            errors.push(`No label for thread type`);
        }

        const passed = errors.length === 0;
        console.log(`   ${passed ? '✅ PASS' : '❌ FAIL'}`);

        if (!passed) {
            errors.forEach(e => console.log(`      ⚠️  ${e}`));
        }

        console.log('');
        results.push({ name: testCase.name, passed, errors });
    }

    return results;
}

function runQuickActionTests(): TestResult[] {
    const results: TestResult[] = [];

    console.log('🎯 Quick Action Tests');
    console.log('=' .repeat(60));
    console.log('');

    const superUserActions = INBOX_QUICK_ACTIONS.filter(a => a.roles.includes('super_user'));
    console.log(`Found ${superUserActions.length} Super User quick actions\n`);

    const expectedActions = [
        'daily-standup',
        'sprint-planning',
        'incident-response',
        'customer-onboarding',
        'deep-research',
        'compliance-brief',
        'cash-flow',
        'board-update',
    ];

    for (const expectedId of expectedActions) {
        const action = superUserActions.find(a => a.id === expectedId);
        const errors: string[] = [];

        if (!action) {
            errors.push(`Quick action not found: ${expectedId}`);
        } else {
            // Verify the action has required fields
            if (!action.label) errors.push('Missing label');
            if (!action.description) errors.push('Missing description');
            if (!action.threadType) errors.push('Missing threadType');
            if (!action.defaultAgent) errors.push('Missing defaultAgent');
            if (!action.promptTemplate) errors.push('Missing promptTemplate');
        }

        const passed = errors.length === 0;
        console.log(`${passed ? '✅' : '❌'} ${expectedId}`);

        if (action) {
            console.log(`   Agent: ${action.defaultAgent} | Thread: ${action.threadType}`);
        }

        if (!passed) {
            errors.forEach(e => console.log(`   ⚠️  ${e}`));
        }

        results.push({ name: expectedId, passed, errors });
    }

    return results;
}

function printSummary(routingResults: TestResult[], actionResults: TestResult[]) {
    const allResults = [...routingResults, ...actionResults];
    const passed = allResults.filter(r => r.passed).length;
    const failed = allResults.filter(r => !r.passed).length;

    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log('');
    console.log(`✅ Passed: ${passed}/${allResults.length}`);
    console.log(`❌ Failed: ${failed}/${allResults.length}`);
    console.log('');

    if (failed > 0) {
        console.log('Failed Tests:');
        allResults.filter(r => !r.passed).forEach(r => {
            console.log(`  - ${r.name}`);
            r.errors.forEach(e => console.log(`      ${e}`));
        });
    }

    console.log('\n✨ Configuration test complete.\n');
}

// ============ Main ============

const routingResults = runTests();
const actionResults = runQuickActionTests();
printSummary(routingResults, actionResults);
