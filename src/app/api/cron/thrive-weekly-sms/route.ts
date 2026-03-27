import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { blackleafService } from '@/lib/notifications/blackleaf-service';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/server/auth/cron';

const THRIVE_ORG_ID = 'org_thrive_syracuse';
const THRIVE_WEEKLY_SMS_TYPE = 'thrive_weekly_sms_deals';
const THRIVE_WEEKLY_SMS_PLAYBOOK_ID = 'thrive_weekly_sms_playbook';
const DEDUPE_WINDOW_DAYS = 7;

function buildWeeklyDealsMessage(firstName?: string | null): string {
    const greeting = firstName?.trim() ? `Hi ${firstName.trim()},` : 'Hi there,';
    return `${greeting} this is Thrive Syracuse with your weekly VIP deals. Text back what you want to feel today and Smokey can help with product picks. Reply STOP to opt out.`;
}

export async function POST(request: NextRequest) {
    const authError = await requireCronSecret(request, 'THRIVE_WEEKLY_SMS');
    if (authError) {
        return authError;
    }

    try {
        const db = getAdminFirestore();
        const dedupeSince = new Date(Date.now() - DEDUPE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

        const [customersSnapshot, recentCommsSnapshot] = await Promise.all([
            db.collection('customers')
                .where('orgId', '==', THRIVE_ORG_ID)
                .where('smsConsent', '==', true)
                .get(),
            db.collection('customer_communications')
                .where('orgId', '==', THRIVE_ORG_ID)
                .where('type', '==', THRIVE_WEEKLY_SMS_TYPE)
                .where('sentAt', '>=', dedupeSince)
                .get(),
        ]);

        const recentlyMessagedCustomerIds = new Set(
            recentCommsSnapshot.docs
                .map((doc) => doc.data()?.customerId)
                .filter((value): value is string => typeof value === 'string' && value.length > 0),
        );

        let sent = 0;
        let skipped = 0;
        let failed = 0;

        for (const customerDoc of customersSnapshot.docs) {
            const customer = customerDoc.data();
            const phone = typeof customer.phone === 'string' ? customer.phone : '';

            if (!phone) {
                skipped += 1;
                continue;
            }

            if (recentlyMessagedCustomerIds.has(customerDoc.id)) {
                skipped += 1;
                continue;
            }

            const message = buildWeeklyDealsMessage(
                typeof customer.firstName === 'string' ? customer.firstName : null,
            );
            const success = await blackleafService.sendCustomMessage(phone, message);

            if (!success) {
                failed += 1;
                logger.warn('[ThriveWeeklySms] Failed to send weekly deals SMS', {
                    orgId: THRIVE_ORG_ID,
                    customerId: customerDoc.id,
                    phone,
                    playbookId: THRIVE_WEEKLY_SMS_PLAYBOOK_ID,
                    dedupeWindowDays: DEDUPE_WINDOW_DAYS,
                    messageId: null,
                });
                continue;
            }

            recentlyMessagedCustomerIds.add(customerDoc.id);
            sent += 1;

            await db.collection('customer_communications').add({
                orgId: THRIVE_ORG_ID,
                type: THRIVE_WEEKLY_SMS_TYPE,
                channel: 'sms',
                direction: 'outbound',
                status: 'sent',
                customerId: customerDoc.id,
                customerEmail: typeof customer.email === 'string' ? customer.email : phone,
                preview: message.slice(0, 200),
                playbookId: THRIVE_WEEKLY_SMS_PLAYBOOK_ID,
                provider: 'blackleaf',
                sentAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: {
                    dedupeWindowDays: DEDUPE_WINDOW_DAYS,
                    phone,
                },
            });

            logger.info('[ThriveWeeklySms] Sent weekly deals SMS', {
                orgId: THRIVE_ORG_ID,
                customerId: customerDoc.id,
                phone,
                playbookId: THRIVE_WEEKLY_SMS_PLAYBOOK_ID,
                dedupeWindowDays: DEDUPE_WINDOW_DAYS,
                messageId: null,
            });
        }

        return NextResponse.json({
            success: true,
            orgId: THRIVE_ORG_ID,
            processed: customersSnapshot.size,
            sent,
            skipped,
            failed,
        });
    } catch (error) {
        logger.error('[ThriveWeeklySms] Cron failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        );
    }
}
