/**
 * Firebase App Hosting Build Monitor
 * Monitors Firebase deployments for failures and alerts Super Users
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { sendEmailViaMailjet } from '@/server/services/communications/email';
import { slackService } from '@/server/services/communications/slack';

export interface BuildStatus {
    commitHash: string;
    status: 'pending' | 'building' | 'success' | 'failed';
    timestamp: Date;
    duration?: number;
    errorMessage?: string;
}

export interface BuildMonitorRecord {
    commitHash: string;
    status: BuildStatus['status'];
    timestamp: Date;
    duration: number;
    errorMessage?: string;
    notificationsSent: {
        email: boolean;
        slack: boolean;
        agent: boolean;
    };
}

let firestore: ReturnType<typeof getAdminFirestore> | null = null;

function getFirestore() {
    if (!firestore) {
        firestore = getAdminFirestore();
    }
    return firestore;
}

/**
 * Get recent build statuses from Firestore
 */
export async function getRecentBuildStatuses(limit: number = 20): Promise<BuildMonitorRecord[]> {
    try {
        const snapshot = await getFirestore()
            .collection('firebase_build_monitor')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            ...doc.data(),
            timestamp: doc.data().timestamp.toDate?.() || new Date(doc.data().timestamp)
        } as BuildMonitorRecord));
    } catch (error: any) {
        logger.error('[BuildMonitor] Failed to fetch recent builds', {
            error: error instanceof Error ? error.message : String(error)
        });
        return [];
    }
}

/**
 * Get the last known build status
 */
export async function getLastBuildStatus(): Promise<BuildMonitorRecord | null> {
    try {
        const snapshot = await getFirestore()
            .collection('firebase_build_monitor')
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return {
            ...doc.data(),
            timestamp: doc.data().timestamp.toDate?.() || new Date(doc.data().timestamp)
        } as BuildMonitorRecord;
    } catch (error: any) {
        logger.error('[BuildMonitor] Failed to fetch last build status', {
            error: error instanceof Error ? error.message : String(error)
        });
        return null;
    }
}

/**
 * Record a build status check
 */
export async function recordBuildStatus(status: BuildMonitorRecord): Promise<void> {
    try {
        const docRef = getFirestore().collection('firebase_build_monitor').doc();
        await docRef.set({
            ...status,
            timestamp: new Date()
        });
        logger.info('[BuildMonitor] Recorded build status', {
            commitHash: status.commitHash,
            status: status.status
        });
    } catch (error: any) {
        logger.error('[BuildMonitor] Failed to record build status', {
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

/**
 * Send build failure notification
 */
export async function notifyBuildFailure(
    commitHash: string,
    errorMessage: string,
    recipientEmail: string,
    slackUserId?: string
): Promise<void> {
    try {
        // Send email
        const emailSubject = `🚨 Firebase Build Failed: ${commitHash.slice(0, 8)}`;
        const emailContent = `
<h2 style="color: #d32f2f;">Build Deployment Failed</h2>
<p><strong>Commit:</strong> ${commitHash}</p>
<p><strong>Error:</strong></p>
<pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto;">
${errorMessage.slice(0, 500)}${errorMessage.length > 500 ? '...' : ''}
</pre>
<p><strong>Action:</strong> Check Firebase App Hosting console or ask Linus (CTO) to investigate.</p>
`;

        await sendEmailViaMailjet(
            recipientEmail,
            emailSubject,
            emailContent,
            'Build Failure Alert'
        );
        logger.info('[BuildMonitor] Email sent', { to: recipientEmail });

        // Send Slack notification
        if (slackUserId) {
            const slackText = `🚨 *Firebase Build Failed*\nCommit: \`${commitHash.slice(0, 8)}\`\nError: ${errorMessage.slice(0, 100)}...`;
            await slackService.postMessage(`@${slackUserId}`, slackText);
            logger.info('[BuildMonitor] Slack message sent', { to: slackUserId });
        }
    } catch (error: any) {
        logger.error('[BuildMonitor] Failed to send notifications', {
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

/**
 * Main monitoring function - called by cron
 */
export async function runBuildMonitoring(): Promise<{
    success: boolean;
    checked: number;
    failures: number;
    notificationsSent: number;
    durationMs: number;
}> {
    const startTime = Date.now();
    let checked = 0;
    let failures = 0;
    let notificationsSent = 0;

    try {
        // Get recent build history
        const recentBuilds = await getRecentBuildStatuses(5);
        checked = recentBuilds.length;

        // Check for recent failures
        const failedBuilds = recentBuilds.filter(b => b.status === 'failed');
        failures = failedBuilds.length;

        // For each failed build, send notifications if not already sent
        for (const build of failedBuilds) {
            if (!build.notificationsSent?.email) {
                // Notify Super Users
                const superUsers = await getFirestore()
                    .collection('users')
                    .where('role', '==', 'super_user')
                    .limit(1)
                    .get();

                for (const userDoc of superUsers.docs) {
                    const user = userDoc.data();
                    await notifyBuildFailure(
                        build.commitHash,
                        build.errorMessage || 'Unknown error',
                        user.email,
                        user.slackUserId
                    );
                    notificationsSent++;
                }

                // Mark notifications as sent
                const recordDoc = (await getFirestore()
                    .collection('firebase_build_monitor')
                    .where('commitHash', '==', build.commitHash)
                    .limit(1)
                    .get()).docs[0];

                if (recordDoc) {
                    await recordDoc.ref.update({
                        notificationsSent: {
                            email: true,
                            slack: true,
                            agent: false
                        }
                    });
                }
            }
        }

        logger.info('[BuildMonitor] Monitoring complete', {
            checked,
            failures,
            notificationsSent
        });

        return {
            success: true,
            checked,
            failures,
            notificationsSent,
            durationMs: Date.now() - startTime
        };
    } catch (error: any) {
        logger.error('[BuildMonitor] Monitoring failed', {
            error: error instanceof Error ? error.message : String(error)
        });
        return {
            success: false,
            checked,
            failures,
            notificationsSent,
            durationMs: Date.now() - startTime
        };
    }
}
