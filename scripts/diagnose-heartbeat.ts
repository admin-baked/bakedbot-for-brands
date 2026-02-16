/**
 * Heartbeat Diagnostic Script
 *
 * Diagnoses heartbeat system issues for a specific tenant
 * Run with: npx tsx scripts/diagnose-heartbeat.ts [tenantId]
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

interface DiagnosticIssue {
    severity: 'critical' | 'warning' | 'info';
    category: string;
    message: string;
    autoFixable: boolean;
}

async function diagnoseHeartbeat(tenantId: string) {
    console.log('🔍 Heartbeat Diagnostic Tool');
    console.log('════════════════════════════════════════════════════════\n');
    console.log(`Tenant ID: ${tenantId}\n`);

    const issues: DiagnosticIssue[] = [];
    const info: string[] = [];

    try {
        // 1. Check if tenant exists
        console.log('1️⃣  Checking tenant exists...');
        const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();

        if (!tenantDoc.exists) {
            issues.push({
                severity: 'critical',
                category: 'Tenant',
                message: `Tenant ${tenantId} does not exist`,
                autoFixable: false,
            });
            console.log('   ❌ Tenant not found\n');
            return { issues, info };
        }

        const tenantData = tenantDoc.data();
        console.log(`   ✅ Tenant found: ${tenantData?.name || tenantId}`);
        info.push(`Tenant Name: ${tenantData?.name || 'Unknown'}`);
        info.push(`Tenant Type: ${tenantData?.type || 'Unknown'}`);

        // 2. Check tenant status
        console.log('\n2️⃣  Checking tenant status...');
        if (tenantData?.status !== 'active') {
            issues.push({
                severity: 'critical',
                category: 'Tenant Status',
                message: `Tenant status is "${tenantData?.status}" (must be "active")`,
                autoFixable: true,
            });
            console.log(`   ❌ Status: ${tenantData?.status} (should be "active")`);
        } else {
            console.log('   ✅ Status: active');
        }

        // 3. Check heartbeat configuration
        console.log('\n3️⃣  Checking heartbeat configuration...');
        const configDoc = await firestore
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('heartbeat')
            .get();

        if (!configDoc.exists) {
            issues.push({
                severity: 'warning',
                category: 'Configuration',
                message: 'Heartbeat configuration not initialized (will use defaults)',
                autoFixable: true,
            });
            console.log('   ⚠️  No configuration found (using defaults)');
        } else {
            const config = configDoc.data();
            console.log('   ✅ Configuration exists');

            if (config?.enabled === false) {
                issues.push({
                    severity: 'critical',
                    category: 'Configuration',
                    message: 'Heartbeat is disabled',
                    autoFixable: true,
                });
                console.log('   ❌ Heartbeat is DISABLED');
            } else {
                console.log('   ✅ Heartbeat is enabled');
            }

            info.push(`Interval: ${config?.interval || 30} minutes`);
            info.push(`Active Hours: ${config?.activeHours?.start || 9}:00 - ${config?.activeHours?.end || 21}:00`);
            info.push(`Timezone: ${config?.timezone || 'America/New_York'}`);
            info.push(`Enabled Checks: ${config?.enabledChecks?.length || 0}`);

            // Check if lastRun is preventing execution
            if (config?.lastRun) {
                const lastRun = config.lastRun.toDate();
                const now = new Date();
                const intervalMs = (config.interval || 30) * 60 * 1000;
                const timeSinceLastRun = now.getTime() - lastRun.getTime();
                const minutesSinceLastRun = Math.floor(timeSinceLastRun / 60000);

                info.push(`Last Run: ${lastRun.toISOString()} (${minutesSinceLastRun} min ago)`);

                if (timeSinceLastRun < intervalMs) {
                    const minutesUntilDue = Math.ceil((intervalMs - timeSinceLastRun) / 60000);
                    issues.push({
                        severity: 'info',
                        category: 'Timing',
                        message: `Next heartbeat due in ${minutesUntilDue} minutes`,
                        autoFixable: true,
                    });
                    console.log(`   ℹ️  Not due yet (${minutesUntilDue} min remaining)`);
                } else {
                    console.log(`   ✅ Due for execution (${minutesSinceLastRun} min since last run)`);
                }
            } else {
                console.log('   ⚠️  Never executed');
            }

            // Check active hours
            const currentHour = new Date().getHours();
            const activeStart = config?.activeHours?.start || 9;
            const activeEnd = config?.activeHours?.end || 21;
            const isActiveHour = currentHour >= activeStart && currentHour < activeEnd;

            if (!isActiveHour) {
                issues.push({
                    severity: 'warning',
                    category: 'Active Hours',
                    message: `Outside active hours (${activeStart}:00-${activeEnd}:00, current: ${currentHour}:00)`,
                    autoFixable: false,
                });
                console.log(`   ⚠️  Outside active hours (current: ${currentHour}:00)`);
            } else {
                console.log(`   ✅ Within active hours (${currentHour}:00)`);
            }
        }

        // 4. Check for primary user
        console.log('\n4️⃣  Checking primary user...');
        const ownerId = tenantData?.ownerId || tenantData?.primaryUserId;
        if (!ownerId) {
            issues.push({
                severity: 'warning',
                category: 'User',
                message: 'No ownerId or primaryUserId set (will use tenantId)',
                autoFixable: false,
            });
            console.log('   ⚠️  No primary user found');
        } else {
            console.log(`   ✅ Primary user: ${ownerId}`);
            info.push(`Owner ID: ${ownerId}`);
        }

        // 5. Check recent executions
        console.log('\n5️⃣  Checking recent executions...');
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        const executionsSnapshot = await firestore
            .collection('heartbeat_executions')
            .where('tenantId', '==', tenantId)
            .where('completedAt', '>=', fifteenMinsAgo)
            .orderBy('completedAt', 'desc')
            .limit(5)
            .get();

        if (executionsSnapshot.empty) {
            const allExecutions = await firestore
                .collection('heartbeat_executions')
                .where('tenantId', '==', tenantId)
                .orderBy('completedAt', 'desc')
                .limit(1)
                .get();

            if (allExecutions.empty) {
                issues.push({
                    severity: 'warning',
                    category: 'Executions',
                    message: 'No executions found in history',
                    autoFixable: true,
                });
                console.log('   ⚠️  No executions ever');
            } else {
                const lastExec = allExecutions.docs[0].data();
                const lastTime = lastExec.completedAt?.toDate();
                const minutesAgo = Math.floor((Date.now() - lastTime.getTime()) / 60000);
                issues.push({
                    severity: 'warning',
                    category: 'Executions',
                    message: `No executions in last 15 min (last: ${minutesAgo} min ago)`,
                    autoFixable: true,
                });
                console.log(`   ⚠️  Last execution: ${minutesAgo} min ago`);
                info.push(`Last Status: ${lastExec.overallStatus}`);
            }
        } else {
            console.log(`   ✅ ${executionsSnapshot.size} executions in last 15 min`);
            const latest = executionsSnapshot.docs[0].data();
            info.push(`Latest Status: ${latest.overallStatus}`);
            info.push(`Latest Checks: ${latest.checksRun || 0}`);
            info.push(`Latest Notifications: ${latest.notificationsSent || 0}`);
        }

        // 6. Check Cloud Scheduler (CRON_SECRET)
        console.log('\n6️⃣  Checking Cloud Scheduler setup...');
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) {
            issues.push({
                severity: 'critical',
                category: 'Cloud Scheduler',
                message: 'CRON_SECRET environment variable not set',
                autoFixable: false,
            });
            console.log('   ❌ CRON_SECRET not configured');
        } else {
            console.log('   ✅ CRON_SECRET is configured');
            info.push(`CRON_SECRET: ${cronSecret.substring(0, 10)}...`);
        }

        // 7. Check system errors
        console.log('\n7️⃣  Checking system errors...');
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        try {
            const errorsSnapshot = await firestore
                .collection('system_logs')
                .where('level', '==', 'error')
                .where('timestamp', '>=', oneDayAgo)
                .where('context.tenantId', '==', tenantId)
                .limit(10)
                .get();

            if (errorsSnapshot.size > 0) {
                issues.push({
                    severity: 'warning',
                    category: 'System Errors',
                    message: `${errorsSnapshot.size} errors in last 24h`,
                    autoFixable: false,
                });
                console.log(`   ⚠️  ${errorsSnapshot.size} errors found`);
            } else {
                console.log('   ✅ No errors in last 24h');
            }
        } catch (err) {
            console.log('   ℹ️  Could not check system errors (collection may not exist)');
        }

    } catch (error) {
        console.error('\n❌ Diagnostic failed:', error);
        issues.push({
            severity: 'critical',
            category: 'Diagnostic',
            message: `Diagnostic error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            autoFixable: false,
        });
    }

    return { issues, info };
}

async function main() {
    const tenantId = process.argv[2] || 'org_thrive_syracuse';

    const { issues, info } = await diagnoseHeartbeat(tenantId);

    // Print summary
    console.log('\n════════════════════════════════════════════════════════');
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('════════════════════════════════════════════════════════\n');

    const critical = issues.filter(i => i.severity === 'critical');
    const warnings = issues.filter(i => i.severity === 'warning');
    const infoIssues = issues.filter(i => i.severity === 'info');
    const autoFixable = issues.filter(i => i.autoFixable);

    if (critical.length === 0 && warnings.length === 0) {
        console.log('✅ NO ISSUES FOUND - Heartbeat system is healthy!\n');
    } else {
        if (critical.length > 0) {
            console.log(`🚨 CRITICAL ISSUES: ${critical.length}`);
            critical.forEach(issue => {
                console.log(`   ❌ [${issue.category}] ${issue.message}`);
                if (issue.autoFixable) console.log('      → Auto-fixable ✨');
            });
            console.log('');
        }

        if (warnings.length > 0) {
            console.log(`⚠️  WARNINGS: ${warnings.length}`);
            warnings.forEach(issue => {
                console.log(`   ⚠️  [${issue.category}] ${issue.message}`);
                if (issue.autoFixable) console.log('      → Auto-fixable ✨');
            });
            console.log('');
        }

        if (infoIssues.length > 0) {
            console.log(`ℹ️  INFO: ${infoIssues.length}`);
            infoIssues.forEach(issue => {
                console.log(`   ℹ️  [${issue.category}] ${issue.message}`);
            });
            console.log('');
        }

        if (autoFixable.length > 0) {
            console.log(`✨ ${autoFixable.length} issue(s) can be auto-fixed!`);
            console.log(`   Run: npx tsx scripts/fix-heartbeat.ts ${tenantId}\n`);
        }
    }

    if (info.length > 0) {
        console.log('📋 SYSTEM INFO:');
        info.forEach(i => console.log(`   • ${i}`));
        console.log('');
    }

    console.log('════════════════════════════════════════════════════════\n');

    if (critical.length > 0) {
        process.exit(1);
    }
}

main().catch(console.error);
