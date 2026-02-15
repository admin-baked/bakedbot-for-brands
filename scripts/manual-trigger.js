/**
 * Manual Playbook Trigger - Simple Node.js script
 *
 * Usage:
 * 1. Log into https://bakedbot.ai as super user
 * 2. Open DevTools → Console
 * 3. Run: JSON.parse(localStorage.getItem('firebase:authUser:AIzaSyBcF5nXDfTzC8MZCEYbqOE6_Jj9r9zQ9kI:[DEFAULT]')).stsTokenManager.accessToken
 * 4. Copy the token
 * 5. Run: node scripts/manual-trigger.js <playbookId> <orgId> <token>
 *
 * Shortcuts:
 * - node scripts/manual-trigger.js test <token>          → System test playbook
 * - node scripts/manual-trigger.js competitive <token>   → Thrive competitive intel
 */

// Quick test shortcuts
const SHORTCUTS = {
    'test': { id: 'SLtofEY4zrJELhtvIcqb', orgId: 'system', name: '🧪 System Test' },
    'competitive': { id: 'mZVlcDru5iZRqWTlBHIF', orgId: 'org_thrive_syracuse', name: '🔍 Competitive Intelligence' },
};

let playbookId = process.argv[2] || 'mZVlcDru5iZRqWTlBHIF';
let orgId = process.argv[3] || 'org_thrive_syracuse';
let token = process.argv[4];

// Check if first arg is a shortcut
if (SHORTCUTS[process.argv[2]]) {
    const shortcut = SHORTCUTS[process.argv[2]];
    console.log(`[Shortcut] Using ${shortcut.name} playbook`);
    playbookId = shortcut.id;
    orgId = shortcut.orgId;
    token = process.argv[3]; // Token is now 3rd arg
}

if (!token) {
    console.error('❌ Missing token. Usage: node scripts/manual-trigger.js <playbookId> <orgId> <token>');
    console.error('\nTo get your token:');
    console.error('1. Log into https://bakedbot.ai as super user');
    console.error('2. Open DevTools → Console');
    console.error('3. Run: JSON.parse(localStorage.getItem(\'firebase:authUser:AIzaSyBcF5nXDfTzC8MZCEYbqOE6_Jj9r9zQ9kI:[DEFAULT]\')).stsTokenManager.accessToken');
    console.error('4. Copy the token and run this script again');
    process.exit(1);
}

const API_BASE = 'https://bakedbot.ai';

async function trigger() {
    console.log('[Trigger] Playbook ID:', playbookId);
    console.log('[Trigger] Organization:', orgId);
    console.log('[Trigger] Calling API...\n');

    try {
        const startTime = Date.now();

        const response = await fetch(`${API_BASE}/api/playbooks/${playbookId}/execute`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                triggeredBy: 'manual',
                orgId,
            }),
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        if (!response.ok) {
            const error = await response.text();
            console.error(`❌ API error (${response.status}):`, error);
            process.exit(1);
        }

        const result = await response.json();

        console.log('='.repeat(70));
        console.log('✅ PLAYBOOK EXECUTION COMPLETE');
        console.log('='.repeat(70));
        console.log(`\nExecution ID: ${result.executionId}`);
        console.log(`Status: ${result.status}`);
        console.log(`Duration: ${duration}s`);
        console.log(`\nStep Results:`);

        if (result.stepResults) {
            result.stepResults.forEach((step, i) => {
                const emoji = step.status === 'completed' ? '✅' : step.status === 'failed' ? '❌' : '⏭️';
                console.log(`  ${emoji} Step ${i + 1}: ${step.action} - ${step.status}`);
                if (step.error) {
                    console.log(`     Error: ${step.error}`);
                }
            });
        }

        console.log('\n📧 Check martez@bakedbot.ai for the email report!');
        console.log('📊 Check inbox for notification!');
        console.log('📁 Check BakedBot Drive → Documents for the full report!');
        console.log('='.repeat(70) + '\n');

        if (!result.success) {
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Execution failed:', error.message);
        process.exit(1);
    }
}

trigger();
