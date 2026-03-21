import fs from 'fs';
import path from 'path';
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { NextRequest } from 'next/server';

const DEFAULT_ORG_ID = 'org_test_proactive_smoke';
const DEFAULT_CRON_SECRET = 'local-proactive-smoke-secret';

declare global {
    // Provided by scripts/run-proactive-smoke.cjs so script imports use tsx's TS-aware loader.
    // eslint-disable-next-line no-var
    var __tsxRequire: ((specifier: string, from: string) => unknown) | undefined;
}

function requireFromScript<T>(specifier: string): T {
    if (!globalThis.__tsxRequire) {
        throw new Error('tsx require hook is not available for smoke script imports');
    }

    return globalThis.__tsxRequire(specifier, import.meta.url) as T;
}

type JsonRecord = Record<string, unknown>;

function getArg(name: string): string | undefined {
    const prefix = `--${name}=`;
    return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
    return process.argv.includes(`--${name}`);
}

function getDb(): Firestore {
    const existing = getApps()[0];
    if (existing) {
        return getFirestore(existing);
    }

    const localServiceAccountPath = path.resolve(process.cwd(), 'service-account.json');
    if (fs.existsSync(localServiceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(localServiceAccountPath, 'utf-8'));
        initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id,
        });
        return getFirestore();
    }

    initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8',
    });
    return getFirestore();
}

async function deleteDocsByField(
    db: Firestore,
    collectionName: string,
    field: string,
    value: string
): Promise<number> {
    const snap = await db.collection(collectionName).where(field, '==', value).get();
    let deleted = 0;
    for (const doc of snap.docs) {
        await doc.ref.delete();
        deleted += 1;
    }
    return deleted;
}

async function deleteCollectionDocs(collection: FirebaseFirestore.CollectionReference): Promise<number> {
    const snap = await collection.get();
    let deleted = 0;
    for (const doc of snap.docs) {
        await doc.ref.delete();
        deleted += 1;
    }
    return deleted;
}

async function cleanSmokeOrg(db: Firestore, orgId: string): Promise<void> {
    const cleanupTargets: Array<{ collection: string; field: string }> = [
        { collection: 'customers', field: 'orgId' },
        { collection: 'inbox_threads', field: 'orgId' },
        { collection: 'inbox_artifacts', field: 'orgId' },
        { collection: 'proactive_tasks', field: 'tenantId' },
        { collection: 'proactive_task_evidence', field: 'tenantId' },
        { collection: 'proactive_commitments', field: 'tenantId' },
        { collection: 'proactive_events', field: 'tenantId' },
        { collection: 'proactive_outcomes', field: 'tenantId' },
        { collection: 'pricing_alerts', field: 'tenantId' },
        { collection: 'competitor_price_history', field: 'tenantId' },
        { collection: 'campaigns', field: 'orgId' },
        { collection: 'customer_communications', field: 'orgId' },
        { collection: 'scheduled_emails', field: 'metadata.tenantId' },
    ];

    for (const target of cleanupTargets) {
        try {
            await deleteDocsByField(db, target.collection, target.field, orgId);
        } catch {
            // Ignore missing index or empty collection cases in smoke cleanup.
        }
    }

    const tenantRef = db.collection('tenants').doc(orgId);
    await deleteCollectionDocs(tenantRef.collection('products_competitive'));
    await deleteCollectionDocs(tenantRef.collection('competitors'));
    await deleteCollectionDocs(tenantRef.collection('price_points_competitive'));
    await deleteCollectionDocs(
        tenantRef.collection('publicViews').doc('products').collection('items')
    );
    await tenantRef.collection('settings').doc('pricing_alerts').delete().catch(() => undefined);
    await tenantRef.delete().catch(() => undefined);
}

async function seedRetentionData(db: Firestore, orgId: string): Promise<string[]> {
    const now = Date.now();
    const customerDocs = [
        {
            id: 'cust_vip_1',
            data: {
                orgId,
                displayName: 'Avery VIP',
                email: 'avery.vip@example.com',
                segment: 'vip',
                lifetimeValue: 2400,
                totalSpent: 2400,
                orderCount: 18,
                points: 900,
                purchaseStreak: 5,
                tier: 'gold',
                lastOrderDate: new Date(now - 52 * 86_400_000),
                createdAt: new Date(now - 365 * 86_400_000),
                updatedAt: new Date(),
            },
        },
        {
            id: 'cust_vip_2',
            data: {
                orgId,
                displayName: 'Morgan VIP',
                email: 'morgan.vip@example.com',
                segment: 'vip',
                lifetimeValue: 1750,
                totalSpent: 1750,
                orderCount: 11,
                points: 620,
                purchaseStreak: 2,
                tier: 'gold',
                churnRiskLevel: 'high',
                lastOrderDate: new Date(now - 67 * 86_400_000),
                createdAt: new Date(now - 280 * 86_400_000),
                updatedAt: new Date(),
            },
        },
        {
            id: 'cust_high_3',
            data: {
                orgId,
                displayName: 'Jordan High Value',
                email: 'jordan.high@example.com',
                segment: 'high_value',
                lifetimeValue: 980,
                totalSpent: 980,
                orderCount: 5,
                points: 210,
                tier: 'silver',
                scoreTrend: 'falling',
                lastOrderDate: new Date(now - 34 * 86_400_000),
                createdAt: new Date(now - 190 * 86_400_000),
                updatedAt: new Date(),
            },
        },
        {
            id: 'cust_loyal_active',
            data: {
                orgId,
                displayName: 'Casey Loyal',
                email: 'casey.loyal@example.com',
                segment: 'loyal',
                lifetimeValue: 640,
                totalSpent: 640,
                orderCount: 9,
                points: 450,
                tier: 'silver',
                lastOrderDate: new Date(now - 6 * 86_400_000),
                createdAt: new Date(now - 140 * 86_400_000),
                updatedAt: new Date(),
            },
        },
        {
            id: 'cust_new_active',
            data: {
                orgId,
                displayName: 'Taylor New',
                email: 'taylor.new@example.com',
                segment: 'new',
                lifetimeValue: 60,
                totalSpent: 60,
                orderCount: 1,
                points: 10,
                tier: 'bronze',
                lastOrderDate: new Date(now - 3 * 86_400_000),
                createdAt: new Date(now - 12 * 86_400_000),
                updatedAt: new Date(),
            },
        },
    ];

    for (const customer of customerDocs) {
        await db.collection('customers').doc(customer.id).set(customer.data);
    }

    return customerDocs
        .filter((customer) => customer.id.startsWith('cust_vip') || customer.id === 'cust_high_3')
        .map((customer) => customer.id);
}

async function seedPricingData(db: Firestore, orgId: string): Promise<void> {
    const tenantRef = db.collection('tenants').doc(orgId);

    await tenantRef.collection('settings').doc('pricing_alerts').set({
        tenantId: orgId,
        enabled: true,
        emailRecipients: [],
        alertThreshold: 10,
        checkFrequency: 1,
        alertTypes: ['price_gap', 'price_decrease', 'price_increase'],
        quietHours: { start: 23, end: 6 },
        updatedAt: new Date(),
    });

    await tenantRef
        .collection('publicViews')
        .doc('products')
        .collection('items')
        .doc('prod_smoke_1')
        .set({
            id: 'prod_smoke_1',
            name: 'Blue Dream 3.5g',
            price: 40,
            inStock: true,
            updatedAt: new Date(),
        });

    await tenantRef.collection('competitors').doc('comp_1').set({
        id: 'comp_1',
        name: 'Competitor One',
        active: true,
        updatedAt: new Date(),
    });

    await tenantRef.collection('products_competitive').doc('comp_prod_1').set({
        id: 'comp_prod_1',
        competitorId: 'comp_1',
        productName: 'Blue Dream 3.5g',
        priceCurrent: 28,
        inStock: true,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
    });
}

async function seedSmokeOrg(db: Firestore, orgId: string): Promise<string[]> {
    await db.collection('tenants').doc(orgId).set({
        id: orgId,
        name: 'Proactive Smoke Org',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
    }, { merge: true });

    const targetedCustomerIds = await seedRetentionData(db, orgId);
    await seedPricingData(db, orgId);
    return targetedCustomerIds;
}

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

async function findLatestByField(
    db: Firestore,
    collectionName: string,
    field: string,
    value: string
): Promise<FirebaseFirestore.QueryDocumentSnapshot | null> {
    const snap = await db.collection(collectionName).where(field, '==', value).get();
    const sorted = [...snap.docs].sort((left, right) => {
        const leftValue = left.data().updatedAt?.toDate?.()?.getTime?.() ?? left.data().createdAt?.toDate?.()?.getTime?.() ?? 0;
        const rightValue = right.data().updatedAt?.toDate?.()?.getTime?.() ?? right.data().createdAt?.toDate?.()?.getTime?.() ?? 0;
        return rightValue - leftValue;
    });
    return sorted[0] ?? null;
}

async function runSmoke(): Promise<void> {
    const orgId = getArg('orgId') || DEFAULT_ORG_ID;
    const cleanFirst = !hasFlag('skip-clean');
    const cronSecret = process.env.CRON_SECRET || DEFAULT_CRON_SECRET;

    process.env.CRON_SECRET = cronSecret;

    const db = getDb();

    if (cleanFirst) {
        console.log(`[smoke] Cleaning ${orgId}...`);
        await cleanSmokeOrg(db, orgId);
    }

    console.log(`[smoke] Seeding ${orgId}...`);
    const targetedCustomerIds = await seedSmokeOrg(db, orgId);

    const retentionRoute = requireFromScript<{
        GET: (request: NextRequest) => Promise<Response>;
    }>('../src/app/api/cron/retention-score/route.ts');
    const pricingRoute = requireFromScript<{
        POST: (request: NextRequest) => Promise<Response>;
    }>('../src/app/api/cron/pricing-alerts/route.ts');
    const campaignSender = requireFromScript<{
        resolveAudience: (campaign: {
            id: string;
            orgId: string;
            createdBy: string;
            name: string;
            goal: string;
            status: string;
            channels: string[];
            audience: {
                type: string;
                customFilter: { customerIds: string[] };
                estimatedCount: number;
            };
            content: Record<string, unknown>;
            createdAt: Date;
            updatedAt: Date;
        }) => Promise<Array<{ customerId: string }>>;
    }>('../src/server/services/campaign-sender.ts');

    const retentionRequest = new NextRequest(
        new Request(`http://localhost/api/cron/retention-score?secret=${encodeURIComponent(cronSecret)}&orgId=${encodeURIComponent(orgId)}`)
    );
    const retentionResponse = await retentionRoute.GET(retentionRequest);
    const retentionJson = await retentionResponse.json() as JsonRecord;

    assert(retentionResponse.status === 200, `Retention route failed: ${retentionResponse.status}`);
    assert(retentionJson.success === true, 'Retention route did not return success');

    const vipRetention = retentionJson.vipRetention as JsonRecord | undefined;
    assert(vipRetention?.success === true, 'VIP retention workflow did not succeed');
    assert((vipRetention?.targetedCustomers as number | undefined) && (vipRetention.targetedCustomers as number) >= 1,
        'VIP retention workflow did not target any customers');

    const vipTaskSnap = await findLatestByField(db, 'proactive_tasks', 'workflowKey', 'vip_retention_watch');
    assert(vipTaskSnap && vipTaskSnap.data().tenantId === orgId, 'VIP proactive task was not written');
    const vipTask = vipTaskSnap.data();

    const vipArtifactSnap = await findLatestByField(db, 'inbox_artifacts', 'orgId', orgId);
    assert(vipArtifactSnap, 'No inbox artifact was created for the smoke org');
    const vipArtifact = vipArtifactSnap.data();
    assert(vipArtifact.type === 'outreach_draft', 'VIP workflow did not create an outreach draft artifact');
    assert(vipArtifact.proactive?.workflowKey === 'vip_retention_watch', 'VIP artifact missing proactive workflow metadata');

    const retentionDraftData = vipArtifact.data as {
        targetCustomerIds?: string[];
        estimatedRecipients?: number;
        body?: string;
        subject?: string;
        htmlBody?: string;
        targetSegments?: string[];
    };
    assert(Array.isArray(retentionDraftData.targetCustomerIds), 'VIP artifact missing targeted customer ids');
    assert(retentionDraftData.targetCustomerIds?.length === targetedCustomerIds.length,
        'VIP artifact targeted customer count mismatch');

    const resolvedRecipients = await campaignSender.resolveAudience({
        id: 'smoke_campaign',
        orgId,
        createdBy: 'system',
        name: 'Smoke VIP Campaign',
        goal: 'winback',
        status: 'approved',
        channels: ['email'],
        audience: {
            type: 'custom',
            customFilter: { customerIds: retentionDraftData.targetCustomerIds ?? [] },
            estimatedCount: retentionDraftData.estimatedRecipients ?? 0,
        },
        content: {
            email: {
                channel: 'email',
                subject: retentionDraftData.subject ?? 'Smoke test',
                body: retentionDraftData.body ?? '',
                htmlBody: retentionDraftData.htmlBody,
                complianceStatus: 'passed',
            },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    const resolvedIds = resolvedRecipients.map((recipient) => recipient.customerId).sort();
    const expectedIds = [...targetedCustomerIds].sort();
    assert(JSON.stringify(resolvedIds) === JSON.stringify(expectedIds),
        `Exact-cohort resolution mismatch. Expected ${expectedIds.join(', ')}, got ${resolvedIds.join(', ')}`);

    const commitmentSnap = await findLatestByField(db, 'proactive_commitments', 'taskId', vipTaskSnap.id);
    assert(commitmentSnap, 'VIP retention commitment was not written');

    const outcomeSnap = await findLatestByField(db, 'proactive_outcomes', 'taskId', vipTaskSnap.id);
    assert(outcomeSnap, 'VIP retention outcome was not written');

    const pricingRequest = new NextRequest(
        new Request('http://localhost/api/cron/pricing-alerts', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${cronSecret}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tenantId: orgId }),
        })
    );
    const pricingResponse = await pricingRoute.POST(pricingRequest);
    const pricingJson = await pricingResponse.json() as JsonRecord;

    assert(pricingResponse.status === 200, `Pricing route failed: ${pricingResponse.status}`);
    assert(pricingJson.success === true, 'Pricing route did not return success');
    assert((pricingJson.alertsTriggered as number | undefined) && (pricingJson.alertsTriggered as number) >= 1,
        'Pricing route did not trigger any alerts');

    const pricingProactive = pricingJson.proactive as JsonRecord | undefined;
    assert(pricingProactive?.success === true, 'Pricing proactive sync did not succeed');

    const pricingTaskSnap = await findLatestByField(db, 'proactive_tasks', 'workflowKey', 'competitor_pricing_watch');
    assert(pricingTaskSnap && pricingTaskSnap.data().tenantId === orgId, 'Pricing proactive task was not written');

    const pricingArtifactSnap = await db
        .collection('inbox_artifacts')
        .where('orgId', '==', orgId)
        .where('type', '==', 'market_analysis')
        .get();
    assert(!pricingArtifactSnap.empty, 'Pricing workflow did not create a market analysis artifact');
    const pricingArtifact = pricingArtifactSnap.docs
        .sort((left, right) => {
            const leftTime = left.data().updatedAt?.toDate?.()?.getTime?.() ?? 0;
            const rightTime = right.data().updatedAt?.toDate?.()?.getTime?.() ?? 0;
            return rightTime - leftTime;
        })[0]
        .data();
    assert(pricingArtifact.proactive?.workflowKey === 'competitor_pricing_watch',
        'Pricing artifact missing proactive workflow metadata');

    const pricingAlertSnap = await db.collection('pricing_alerts').where('tenantId', '==', orgId).get();
    assert(!pricingAlertSnap.empty, 'Pricing alert documents were not written');

    const pricingOutcomeSnap = await findLatestByField(db, 'proactive_outcomes', 'taskId', pricingTaskSnap.id);
    assert(pricingOutcomeSnap, 'Pricing outcome was not written');

    console.log('');
    console.log('[smoke] PASS');
    console.log(`  orgId: ${orgId}`);
    console.log(`  vip task: ${vipTaskSnap.id}`);
    console.log(`  vip artifact: ${vipArtifactSnap.id}`);
    console.log(`  pricing task: ${pricingTaskSnap.id}`);
    console.log(`  pricing alerts: ${pricingAlertSnap.size}`);
    console.log(`  exact cohort recipients: ${resolvedIds.join(', ')}`);
}

runSmoke().catch((error) => {
    console.error('[smoke] FAIL');
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
});
