/**
 * Heartbeat Auto-Fix Script
 *
 * Automatically fixes common heartbeat issues
 * Run with: npx tsx scripts/fix-heartbeat.ts [tenantId]
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'studio-567050101-bc6e8',
    });
}

const firestore = getFirestore();

async function fixHeartbeat(tenantId: string) {
    console.log('🔧 Heartbeat Auto-Fix Tool');
    console.log('════════════════════════════════════════════════════════\n');
    console.log(`Tenant ID: ${tenantId}\n`);

    const fixes: string[] = [];

    try {
        // 1. Check if tenant exists
        console.log('1️⃣  Checking tenant...');
        const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();

        if (!tenantDoc.exists) {
            console.log('   ❌ Tenant not found - cannot fix');
            return fixes;
        }

        const tenantData = tenantDoc.data();
        console.log(`   ✅ Tenant found: ${tenantData?.name || tenantId}\n`);

        // 2. Fix tenant status
        console.log('2️⃣  Fixing tenant status...');
        if (tenantData?.status !== 'active') {
            await firestore.collection('tenants').doc(tenantId).update({
                status: 'active',
                updatedAt: new Date(),
            });
            fixes.push(`Set tenant status to "active" (was "${tenantData?.status}")`);
            console.log('   ✅ Status set to "active"');
        } else {
            console.log('   ✓  Status already active\n');
        }

        // 3. Initialize/fix heartbeat configuration
        console.log('3️⃣  Fixing heartbeat configuration...');
        const configRef = firestore
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('heartbeat');

        const configDoc = await configRef.get();

        // Determine role
        let role: 'super_user' | 'dispensary' | 'brand' = 'dispensary';
        if (tenantData?.type === 'brand') role = 'brand';
        if (tenantData?.type === 'super_user' || tenantData?.isSuperAdmin) role = 'super_user';

        // Build default checks for role
        const defaultChecks = role === 'super_user'
            ? ['system_errors', 'deployment_status', 'new_signups', 'academy_leads', 'gmail_unread', 'calendar_upcoming']
            : role === 'dispensary'
                ? ['low_stock_alerts', 'expiring_batches', 'margin_alerts', 'competitor_price_changes', 'at_risk_customers', 'birthday_today']
                : ['content_pending_approval', 'campaign_performance', 'competitor_launches', 'partner_performance'];

        const defaultConfig = {
            enabled: true,
            interval: role === 'super_user' ? 30 : role === 'dispensary' ? 15 : 60,
            activeHours: { start: 9, end: 21 },
            timezone: 'America/New_York',
            enabledChecks: defaultChecks,
            channels: ['dashboard', 'email'],
            suppressAllClear: false,
            tenantId,
            role,
            lastRun: null, // Reset lastRun to allow immediate execution
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        if (!configDoc.exists) {
            await configRef.set(defaultConfig);
            fixes.push('Created default heartbeat configuration');
            console.log('   ✅ Created default configuration');
        } else {
            const config = configDoc.data();
            const updates: any = {};

            // Enable if disabled
            if (config?.enabled === false) {
                updates.enabled = true;
                fixes.push('Enabled heartbeat (was disabled)');
                console.log('   ✅ Enabled heartbeat');
            }

            // Reset lastRun if stale (more than interval)
            if (config?.lastRun) {
                const lastRun = config.lastRun.toDate();
                const now = new Date();
                const intervalMs = (config.interval || 30) * 60 * 1000;
                const timeSinceLastRun = now.getTime() - lastRun.getTime();

                if (timeSinceLastRun < intervalMs) {
                    updates.lastRun = null;
                    fixes.push('Reset lastRun to allow immediate execution');
                    console.log('   ✅ Reset lastRun timestamp');
                }
            }

            // Ensure checks are enabled
            if (!config?.enabledChecks || config.enabledChecks.length === 0) {
                updates.enabledChecks = defaultChecks;
                fixes.push(`Enabled ${defaultChecks.length} default checks`);
                console.log('   ✅ Enabled default checks');
            }

            // Apply updates if any
            if (Object.keys(updates).length > 0) {
                updates.updatedAt = new Date();
                await configRef.update(updates);
            } else {
                console.log('   ✓  Configuration already good\n');
            }
        }

        // 4. Manually trigger heartbeat (force execution)
        console.log('4️⃣  Triggering manual heartbeat...');
        try {
            const cronSecret = process.env.CRON_SECRET;
            if (!cronSecret) {
                console.log('   ⚠️  CRON_SECRET not set, skipping manual trigger');
            } else {
                const ownerId = tenantData?.ownerId || tenantData?.primaryUserId || tenantId;

                const response = await fetch('http://localhost:3000/api/cron/heartbeat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${cronSecret}`,
                    },
                    body: JSON.stringify({
                        tenantId,
                        userId: ownerId,
                        role,
                        force: true,
                    }),
                });

                if (response.ok) {
                    const result = await response.json();
                    fixes.push('Manually triggered heartbeat execution');
                    console.log('   ✅ Heartbeat triggered successfully');
                    console.log(`      Checks run: ${result.result?.checksRun || 0}`);
                    console.log(`      Status: ${result.result?.overallStatus || 'unknown'}`);
                } else {
                    const error = await response.text();
                    console.log(`   ⚠️  Manual trigger failed: ${response.status} ${error}`);
                }
            }
        } catch (err) {
            console.log(`   ⚠️  Could not trigger heartbeat: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }

    } catch (error) {
        console.error('\n❌ Fix failed:', error);
        throw error;
    }

    return fixes;
}

async function main() {
    const tenantId = process.argv[2] || 'org_thrive_syracuse';

    const fixes = await fixHeartbeat(tenantId);

    console.log('\n════════════════════════════════════════════════════════');
    console.log('✨ FIX SUMMARY');
    console.log('════════════════════════════════════════════════════════\n');

    if (fixes.length === 0) {
        console.log('✅ No fixes needed - system was already healthy!\n');
    } else {
        console.log(`Applied ${fixes.length} fix(es):\n`);
        fixes.forEach((fix, i) => {
            console.log(`${i + 1}. ${fix}`);
        });
        console.log('');
    }

    console.log('💡 Verify fix with:');
    console.log(`   npx tsx scripts/diagnose-heartbeat.ts ${tenantId}\n`);
    console.log('════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
