/**
 * Provision Thrive Syracuse onto the Optimize plan.
 *
 * Why this exists:
 * - Competitive Intel now reads canonical plan + AI credit state.
 * - Thrive needs Optimize-level Ezal cadence and AI credits for full pilot testing.
 * - Older setup scripts still assume Empire-era plan labels.
 *
 * Usage:
 *   npx tsx scripts/setup-thrive-optimize-plan.ts
 *   npx tsx scripts/setup-thrive-optimize-plan.ts --apply
 */

import fs from 'node:fs';
import path from 'node:path';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { findPricingPlan } from '../src/lib/config/pricing';
import { getEzalLimits } from '../src/lib/plan-limits';

const ORG_ID = 'org_thrive_syracuse';
const USER_EMAIL = 'thrivesyracuse@bakedbot.ai';
const OPTIMIZE_PLAN_ID = 'optimize';

const OPTIMIZE_PLAN = findPricingPlan(OPTIMIZE_PLAN_ID);

if (!OPTIMIZE_PLAN) {
    throw new Error('Optimize pricing plan could not be resolved.');
}

const OPTIMIZE_CREDITS = OPTIMIZE_PLAN.includedCredits ?? 7500;
const OPTIMIZE_AUTOMATION_BUDGET = 2000;
const OPTIMIZE_PLAYBOOK_LIMIT = 25;
const EZAL_LIMITS = getEzalLimits(OPTIMIZE_PLAN_ID);

type FirestoreDoc = Record<string, unknown>;

function ensureAdminApp() {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
        return initializeApp({
            credential: cert(serviceAccount),
        });
    }

    return initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8',
    });
}

function getAdminFirestore() {
    return getFirestore(ensureAdminApp());
}

function getAdminAuth() {
    return getAuth(ensureAdminApp());
}

function currentCycleKey(date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildOptimizeEntitlement(now: number) {
    return {
        orgId: ORG_ID,
        planId: OPTIMIZE_PLAN_ID,
        monthlyCreditsIncluded: OPTIMIZE_CREDITS,
        rolloverCapPct: 0.25,
        canPurchaseTopUps: true,
        requiresApprovalAfterDepletion: false,
        allowChat: true,
        allowResearch: true,
        allowImages: true,
        allowCreativeBatch: true,
        allowShortVideo: true,
        allowFullVideo: true,
        maxActivePlaybooks: OPTIMIZE_PLAYBOOK_LIMIT,
        allowCustomPlaybooks: true,
        monthlyAutomationCreditBudget: OPTIMIZE_AUTOMATION_BUDGET,
        allowAutomationVideo: true,
        requireApprovalForHighCostAutomationSteps: false,
        effectiveAt: now,
        updatedAt: now,
    };
}

function buildOptimizeBalance(existing: FirestoreDoc | undefined, now: number) {
    const nowDate = new Date();
    const cycleStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    const cycleEnd = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 1);

    return {
        orgId: ORG_ID,
        billingCycleKey: currentCycleKey(nowDate),
        includedCreditsTotal: Math.max(
            Number(existing?.includedCreditsTotal ?? 0),
            OPTIMIZE_CREDITS
        ),
        includedCreditsUsed: Number(existing?.includedCreditsUsed ?? 0),
        rolloverCreditsTotal: Number(existing?.rolloverCreditsTotal ?? 0),
        rolloverCreditsUsed: Number(existing?.rolloverCreditsUsed ?? 0),
        topUpCreditsTotal: Number(existing?.topUpCreditsTotal ?? 0),
        topUpCreditsUsed: Number(existing?.topUpCreditsUsed ?? 0),
        automationBudgetTotal: Math.max(
            Number(existing?.automationBudgetTotal ?? 0),
            OPTIMIZE_AUTOMATION_BUDGET
        ),
        automationBudgetUsed: Number(existing?.automationBudgetUsed ?? 0),
        manualCreditsUsed: Number(existing?.manualCreditsUsed ?? 0),
        automationCreditsUsed: Number(existing?.automationCreditsUsed ?? 0),
        alertsSent:
            typeof existing?.alertsSent === 'object' && existing?.alertsSent !== null
                ? existing.alertsSent
                : {},
        cycleStartedAt: Number(existing?.cycleStartedAt ?? cycleStart.getTime()),
        cycleEndsAt: Number(existing?.cycleEndsAt ?? cycleEnd.getTime()),
        createdAt: Number(existing?.createdAt ?? now),
        updatedAt: now,
    };
}

function summarizePlanState(label: string, data: {
    org?: FirestoreDoc;
    subscription?: FirestoreDoc;
    entitlement?: FirestoreDoc;
    balance?: FirestoreDoc;
    claims?: Record<string, unknown> | null;
}) {
    console.log(`\n${label}`);
    console.log('-'.repeat(label.length));
    console.log('Org billing plan:', data.org?.billing && typeof data.org.billing === 'object'
        ? (data.org.billing as FirestoreDoc).planId ?? '(missing)'
        : '(missing)');
    console.log('Org subscription status:', data.org?.billing && typeof data.org.billing === 'object'
        ? (data.org.billing as FirestoreDoc).subscriptionStatus ?? '(missing)'
        : '(missing)');
    console.log('Subscription/current planId:', data.subscription?.planId ?? '(missing)');
    console.log('Subscription/current tierId:', data.subscription?.tierId ?? '(missing)');
    console.log('AI entitlement plan:', data.entitlement?.planId ?? '(missing)');
    console.log(
        'AI entitlement monthly credits:',
        data.entitlement?.monthlyCreditsIncluded ?? '(missing)'
    );
    console.log(
        'Current-cycle credits total:',
        data.balance?.includedCreditsTotal ?? '(missing)'
    );
    console.log(
        'Current-cycle automation budget:',
        data.balance?.automationBudgetTotal ?? '(missing)'
    );
    console.log('Custom claims planId:', data.claims?.planId ?? '(missing)');
    console.log('Custom claims role:', data.claims?.role ?? '(missing)');
}

async function loadState() {
    const db = getAdminFirestore();
    const auth = getAdminAuth();
    const cycleKey = currentCycleKey();

    const [orgSnap, subscriptionSnap, entitlementSnap, balanceSnap] = await Promise.all([
        db.collection('organizations').doc(ORG_ID).get(),
        db.collection('organizations').doc(ORG_ID).collection('subscription').doc('current').get(),
        db.collection('org_ai_studio_entitlements').doc(ORG_ID).get(),
        db.collection('org_ai_studio_balances').doc(`${ORG_ID}-${cycleKey}`).get(),
    ]);

    let authUser: Awaited<ReturnType<typeof auth.getUserByEmail>> | null = null;
    try {
        authUser = await auth.getUserByEmail(USER_EMAIL);
    } catch {
        authUser = null;
    }

    return {
        org: orgSnap.exists ? (orgSnap.data() as FirestoreDoc) : undefined,
        subscription: subscriptionSnap.exists
            ? (subscriptionSnap.data() as FirestoreDoc)
            : undefined,
        entitlement: entitlementSnap.exists
            ? (entitlementSnap.data() as FirestoreDoc)
            : undefined,
        balance: balanceSnap.exists ? (balanceSnap.data() as FirestoreDoc) : undefined,
        authUser,
        claims: authUser?.customClaims ?? null,
    };
}

async function applyUpgrade() {
    const db = getAdminFirestore();
    const auth = getAdminAuth();
    const now = Date.now();
    const cycleKey = currentCycleKey();
    const state = await loadState();

    const currentBilling =
        state.org?.billing && typeof state.org.billing === 'object'
            ? (state.org.billing as FirestoreDoc)
            : {};
    const currentSubscription = state.subscription ?? {};

    const nextBilling = {
        ...currentBilling,
        planId: OPTIMIZE_PLAN_ID,
        planName: OPTIMIZE_PLAN.name,
        subscriptionStatus: 'active',
        status: 'active',
        monthlyPrice: OPTIMIZE_PLAN.price ?? currentBilling.monthlyPrice ?? 0,
        activationFee: OPTIMIZE_PLAN.activationFee ?? currentBilling.activationFee ?? null,
        includedCredits: OPTIMIZE_CREDITS,
        updatedAt: now,
    };

    const nextOrg = {
        plan: OPTIMIZE_PLAN_ID,
        planId: OPTIMIZE_PLAN_ID,
        updatedAt: now,
        billing: nextBilling,
        competitiveIntel: {
            ...(state.org?.competitiveIntel && typeof state.org.competitiveIntel === 'object'
                ? (state.org.competitiveIntel as FirestoreDoc)
                : {}),
            enabled: true,
            planId: OPTIMIZE_PLAN_ID,
            maxCompetitors: EZAL_LIMITS.maxCompetitors,
            frequencyMinutes: EZAL_LIMITS.frequencyMinutes,
            updatedAt: now,
        },
    };

    const nextSubscription = {
        ...currentSubscription,
        planId: OPTIMIZE_PLAN_ID,
        planName: OPTIMIZE_PLAN.name,
        status: 'active',
        updatedAt: now,
    };

    const nextEntitlement = buildOptimizeEntitlement(now);
    const nextBalance = buildOptimizeBalance(state.balance, now);

    const batch = db.batch();
    batch.set(db.collection('organizations').doc(ORG_ID), nextOrg, { merge: true });
    batch.set(
        db.collection('organizations').doc(ORG_ID).collection('subscription').doc('current'),
        nextSubscription,
        { merge: true }
    );
    batch.set(db.collection('org_ai_studio_entitlements').doc(ORG_ID), nextEntitlement, {
        merge: true,
    });
    batch.set(
        db.collection('org_ai_studio_balances').doc(`${ORG_ID}-${cycleKey}`),
        nextBalance,
        { merge: true }
    );

    if (state.authUser) {
        const userDocRef = db.collection('users').doc(state.authUser.uid);
        batch.set(
            userDocRef,
            {
                currentOrgId: ORG_ID,
                billing: {
                    planId: OPTIMIZE_PLAN_ID,
                    planName: OPTIMIZE_PLAN.name,
                    status: 'active',
                    monthlyPrice: OPTIMIZE_PLAN.price ?? 0,
                },
                updatedAt: now,
            },
            { merge: true }
        );
    }

    await batch.commit();

    if (state.authUser) {
        const existingClaims = state.authUser.customClaims || {};
        const existingRole = typeof existingClaims.role === 'string' ? existingClaims.role : null;
        const nextClaims: Record<string, unknown> = {
            ...existingClaims,
            role:
                existingRole === 'dispensary' ||
                existingRole === 'dispensary_admin' ||
                existingRole === 'dispensary_staff'
                    ? existingRole
                    : 'dispensary_admin',
            orgId: ORG_ID,
            currentOrgId: ORG_ID,
            planId: OPTIMIZE_PLAN_ID,
            email: USER_EMAIL,
        };

        if (!nextClaims.brandId) {
            nextClaims.brandId = ORG_ID;
        }

        await auth.setCustomUserClaims(state.authUser.uid, nextClaims);
        await auth.revokeRefreshTokens(state.authUser.uid);
    }

    return loadState();
}

async function main() {
    const shouldApply = process.argv.includes('--apply');

    console.log(`Thrive Syracuse Optimize Provisioning${shouldApply ? ' (apply)' : ' (dry run)'}`);
    console.log('='.repeat(48));
    console.log(`Target org: ${ORG_ID}`);
    console.log(`Target user: ${USER_EMAIL}`);
    console.log(`Optimize monthly price: ${OPTIMIZE_PLAN.priceDisplay}${OPTIMIZE_PLAN.period}`);
    console.log(`Optimize activation fee: ${OPTIMIZE_PLAN.activationFee ? `$${OPTIMIZE_PLAN.activationFee.toLocaleString()}` : 'Included'}`);
    console.log(`Optimize credits: ${OPTIMIZE_CREDITS.toLocaleString()}`);
    console.log(`Optimize automation budget: ${OPTIMIZE_AUTOMATION_BUDGET.toLocaleString()}`);
    console.log(`Ezal cadence: every ${EZAL_LIMITS.frequencyMinutes} minutes`);
    console.log(`Ezal competitor slots: ${EZAL_LIMITS.maxCompetitors}`);

    const before = await loadState();
    summarizePlanState('Before', before);

    if (!shouldApply) {
        console.log('\nDry run only. Re-run with --apply to provision Thrive onto Optimize.');
        return;
    }

    const after = await applyUpgrade();
    summarizePlanState('After', after);
    console.log('\nThrive Syracuse is now provisioned for Optimize testing.');
}

main().catch((error) => {
    console.error('\nFailed to provision Thrive Optimize plan.');
    console.error(error);
    process.exit(1);
});
