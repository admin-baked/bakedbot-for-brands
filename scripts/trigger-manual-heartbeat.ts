/**
 * Manual Heartbeat Trigger
 *
 * Triggers a heartbeat execution for a specific tenant/user to initialize
 * the heartbeat_executions collection and populate the health indicator.
 *
 * Usage:
 *   npx tsx scripts/trigger-manual-heartbeat.ts
 */

const HEARTBEAT_URL = 'https://bakedbot.ai/api/cron/heartbeat';

async function triggerHeartbeat() {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error('❌ CRON_SECRET environment variable is required');
        console.error('   Set it in your .env.local file or run:');
        console.error('   CRON_SECRET=your-secret npx tsx scripts/trigger-manual-heartbeat.ts');
        process.exit(1);
    }

    console.log('🫀 Triggering manual heartbeat execution...');
    console.log(`   URL: ${HEARTBEAT_URL}`);

    try {
        const response = await fetch(HEARTBEAT_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cronSecret}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tenantId: 'system',
                userId: 'system',
                role: 'super_user',
                force: true,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Heartbeat trigger failed');
            console.error(`   Status: ${response.status}`);
            console.error(`   Error: ${JSON.stringify(data, null, 2)}`);
            process.exit(1);
        }

        console.log('✅ Heartbeat execution triggered successfully');
        console.log(`   Execution ID: ${data.result.executionId}`);
        console.log(`   Checks run: ${data.result.checksRun}`);
        console.log(`   Status: ${data.result.overallStatus}`);
        console.log(`   Duration: ${data.result.completedAt.getTime() - data.result.startedAt.getTime()}ms`);
        console.log('\n🎯 Next steps:');
        console.log('   1. Wait 30 seconds for health indicator to poll');
        console.log('   2. Refresh dashboard: https://bakedbot.ai/dashboard');
        console.log('   3. Indicator should show 🟢 System Healthy (green)');

    } catch (error: any) {
        console.error('❌ Failed to trigger heartbeat:', error.message);
        process.exit(1);
    }
}

triggerHeartbeat();
