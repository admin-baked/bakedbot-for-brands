import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * fal.ai Balance Check Cron
 *
 * Tracks platform-wide fal.ai spend against a known balance.
 * fal.ai has no balance API, so we track spend from media_generation_events
 * and subtract from the last-known recharge amount.
 *
 * Alerts via Slack when estimated balance drops below $1.
 *
 * Schedule: Every 6 hours
 * Firestore doc: system_config/fal_balance
 */

const FAL_PROVIDERS = ['kling', 'wan', 'flux-schnell', 'flux-pro'];
const ALERT_THRESHOLD_USD = 1.00;
const CONFIG_DOC = 'system_config/fal_balance';
const ALERT_HISTORY_DOC = 'system_config/fal_balance_alerts';

interface FalBalanceConfig {
    lastRechargeUsd: number;
    lastRechargeAt: string; // ISO date
    alertThresholdUsd: number;
}

const DEFAULT_CONFIG: FalBalanceConfig = {
    lastRechargeUsd: 8.17,
    lastRechargeAt: '2026-04-08T00:00:00Z',
    alertThresholdUsd: ALERT_THRESHOLD_USD,
};

async function getFalSpendSinceRecharge(rechargeDate: Date): Promise<number> {
    const db = getAdminFirestore();
    const snapshot = await db
        .collection('media_generation_events')
        .where('success', '==', true)
        .where('createdAt', '>=', Timestamp.fromDate(rechargeDate))
        .get();

    return snapshot.docs.reduce((total, doc) => {
        const data = doc.data();
        if (FAL_PROVIDERS.includes(data.provider)) {
            return total + (data.costUsd || 0);
        }
        return total;
    }, 0);
}

async function hasAlertedToday(): Promise<boolean> {
    const db = getAdminFirestore();
    const today = new Date().toISOString().split('T')[0];
    const doc = await db.doc(`${ALERT_HISTORY_DOC}/${today}`).get();
    return doc.exists;
}

async function recordAlert(balanceUsd: number, spendUsd: number): Promise<void> {
    const db = getAdminFirestore();
    const today = new Date().toISOString().split('T')[0];
    await db.doc(`${ALERT_HISTORY_DOC}/${today}`).set({
        alertedAt: Timestamp.now(),
        estimatedBalance: balanceUsd,
        totalSpend: spendUsd,
    });
}

async function sendSlackAlert(balanceUsd: number, spendUsd: number, rechargeUsd: number): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_LINUS_APPROVALS || process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
        logger.warn('[FalBalance] No Slack webhook configured');
        return;
    }

    const payload = {
        text: `🚨 *fal.ai Balance Low* — Estimated balance: *$${balanceUsd.toFixed(2)}* (threshold: $${ALERT_THRESHOLD_USD.toFixed(2)})\n• Last recharge: $${rechargeUsd.toFixed(2)}\n• Spent since recharge: $${spendUsd.toFixed(2)}\n• Providers: Wan, Kling, FLUX\n\n👉 Recharge at https://fal.ai/dashboard/billing`,
    };

    const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        logger.error('[FalBalance] Slack alert failed', { status: res.status });
    }
}

export async function GET() {
    try {
        const db = getAdminFirestore();

        // Load config (or use defaults)
        const configDoc = await db.doc(CONFIG_DOC).get();
        const config: FalBalanceConfig = configDoc.exists
            ? { ...DEFAULT_CONFIG, ...configDoc.data() }
            : DEFAULT_CONFIG;

        const rechargeDate = new Date(config.lastRechargeAt);
        const spendSinceRecharge = await getFalSpendSinceRecharge(rechargeDate);
        const estimatedBalance = config.lastRechargeUsd - spendSinceRecharge;

        logger.info('[FalBalance] Check complete', {
            lastRecharge: config.lastRechargeUsd,
            spendSinceRecharge: spendSinceRecharge.toFixed(4),
            estimatedBalance: estimatedBalance.toFixed(2),
            threshold: config.alertThresholdUsd,
        });

        // Alert if below threshold (once per day)
        let alerted = false;
        if (estimatedBalance <= config.alertThresholdUsd) {
            const already = await hasAlertedToday();
            if (!already) {
                await sendSlackAlert(estimatedBalance, spendSinceRecharge, config.lastRechargeUsd);
                await recordAlert(estimatedBalance, spendSinceRecharge);
                alerted = true;
                logger.warn('[FalBalance] LOW BALANCE ALERT sent', { estimatedBalance });
            }
        }

        return NextResponse.json({
            estimatedBalance: parseFloat(estimatedBalance.toFixed(2)),
            spendSinceRecharge: parseFloat(spendSinceRecharge.toFixed(4)),
            lastRechargeUsd: config.lastRechargeUsd,
            lastRechargeAt: config.lastRechargeAt,
            threshold: config.alertThresholdUsd,
            belowThreshold: estimatedBalance <= config.alertThresholdUsd,
            alerted,
        });
    } catch (error) {
        logger.error('[FalBalance] Check failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Balance check failed' },
            { status: 500 },
        );
    }
}

// Cloud Scheduler sends POST
export async function POST(req: Request) {
    return GET();
}
