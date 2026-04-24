'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { sendSesEmail } from '@/lib/email/ses';
import { logger } from '@/lib/logger';

export interface SmsRegistrationData {
    // Business Info
    legalName: string;
    dba: string;
    ein: string;
    entityType: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    website: string;
    yearsInBusiness: string;
    // Contact
    contactFirstName: string;
    contactLastName: string;
    contactTitle: string;
    contactEmail: string;
    contactPhone: string;
    // Campaign
    useCase: string;
    campaignName: string;
    campaignDescription: string;
    sampleMessage1: string;
    sampleMessage2: string;
    sampleMessage3: string;
    optInMethod: string;
    optInConfirmation: boolean;
    ageGate: boolean;
    // Provider
    preferredAreaCode: string;
    providerAccountEmail: string;
    providerApiKey: string;
    // Meta
    submittedAt?: string;
    status: 'draft' | 'ready' | 'submitted';
}

export const EMPTY_SMS_REGISTRATION: SmsRegistrationData = {
    legalName: '',
    dba: '',
    ein: '',
    entityType: 'LLC',
    street: '',
    city: '',
    state: '',
    zip: '',
    website: '',
    yearsInBusiness: '',
    contactFirstName: '',
    contactLastName: '',
    contactTitle: '',
    contactEmail: '',
    contactPhone: '',
    useCase: 'Marketing',
    campaignName: '',
    campaignDescription: '',
    sampleMessage1: '',
    sampleMessage2: '',
    sampleMessage3: '',
    optInMethod: '',
    optInConfirmation: true,
    ageGate: true,
    preferredAreaCode: '',
    providerAccountEmail: '',
    providerApiKey: '',
    status: 'draft',
};

export async function getSmsRegistration(orgId: string): Promise<SmsRegistrationData> {
    await requireUser();
    try {
        const db = getAdminFirestore();
        const snap = await db.doc(`tenants/${orgId}`).get();
        const data = snap.data() as Record<string, unknown> | undefined;
        // Support legacy field names from initial draft saves
        const reg = data?.smsRegistration as (SmsRegistrationData & { blackleafAccountEmail?: string; blackleafApiKey?: string }) | undefined;
        if (!reg) return { ...EMPTY_SMS_REGISTRATION };
        return {
            ...EMPTY_SMS_REGISTRATION,
            ...reg,
            providerAccountEmail: reg.providerAccountEmail ?? reg.blackleafAccountEmail ?? '',
            providerApiKey: reg.providerApiKey ?? reg.blackleafApiKey ?? '',
        };
    } catch (err) {
        logger.error('[SmsRegistration] Failed to load', { orgId, error: String(err) });
        return { ...EMPTY_SMS_REGISTRATION };
    }
}

export async function saveSmsRegistration(
    orgId: string,
    data: SmsRegistrationData,
): Promise<{ success: boolean; error?: string }> {
    await requireUser();
    try {
        const db = getAdminFirestore();
        await db.doc(`tenants/${orgId}`).set(
            { smsRegistration: { ...data, submittedAt: new Date().toISOString() } },
            { merge: true },
        );
        return { success: true };
    } catch (err) {
        logger.error('[SmsRegistration] Failed to save', { orgId, error: String(err) });
        return { success: false, error: String(err) };
    }
}

function buildEmailHtml(d: SmsRegistrationData, orgId: string): string {
    const row = (label: string, value: string) =>
        value ? `<tr><td style="padding:6px 12px;color:#6b7280;font-size:13px;white-space:nowrap">${label}</td><td style="padding:6px 12px;font-size:13px">${value}</td></tr>` : '';

    const section = (title: string, rows: string) =>
        `<h3 style="margin:24px 0 8px;font-size:14px;font-weight:600;color:#111;border-bottom:1px solid #e5e7eb;padding-bottom:6px">${title}</h3>
         <table style="border-collapse:collapse;width:100%">${rows}</table>`;

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#111">
  <div style="background:#000;padding:16px 24px;border-radius:8px 8px 0 0">
    <span style="color:#fff;font-weight:700;font-size:16px">BakedBot</span>
    <span style="color:#9ca3af;font-size:14px;margin-left:12px">SMS / 10DLC Registration</span>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px">
    <p style="margin:0 0 8px;font-size:14px;color:#6b7280">Org ID: <strong style="color:#111">${orgId}</strong></p>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280">Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</p>

    ${section('Business Information', [
        row('Legal Name', d.legalName),
        row('DBA', d.dba),
        row('EIN', d.ein),
        row('Entity Type', d.entityType),
        row('Address', `${d.street}, ${d.city}, ${d.state} ${d.zip}`),
        row('Website', d.website),
        row('Years in Business', d.yearsInBusiness),
    ].join(''))}

    ${section('Authorized Contact', [
        row('Name', `${d.contactFirstName} ${d.contactLastName}`),
        row('Title', d.contactTitle),
        row('Email', d.contactEmail),
        row('Phone', d.contactPhone),
    ].join(''))}

    ${section('Campaign Registration', [
        row('Use Case', d.useCase),
        row('Campaign Name', d.campaignName),
        row('Description', d.campaignDescription),
        row('Sample 1', d.sampleMessage1),
        row('Sample 2', d.sampleMessage2),
        row('Sample 3', d.sampleMessage3),
        row('Opt-in Method', d.optInMethod),
        row('Opt-in Confirmation', d.optInConfirmation ? 'Yes' : 'No'),
        row('Age Gate (21+)', d.ageGate ? 'Yes' : 'No'),
    ].join(''))}

    ${section('SMS Provider Setup', [
        row('Account Email', d.providerAccountEmail),
        row('Preferred Area Code', d.preferredAreaCode || 'Any'),
        row('API Key', d.providerApiKey || '(pending)'),
    ].join(''))}

    <p style="margin-top:24px;font-size:12px;color:#9ca3af">
      View in dashboard: <a href="https://app.bakedbot.ai/dashboard/admin/sms-registrations" style="color:#6366f1">Admin → SMS Registrations</a>
    </p>
  </div>
</body>
</html>`;
}

export async function emailSmsRegistration(
    orgId: string,
    data: SmsRegistrationData,
): Promise<{ success: boolean; error?: string }> {
    await requireUser();
    try {
        await sendSesEmail({
            to: 'martez@bakedbot.ai',
            from: 'hello@bakedbot.ai',
            fromName: 'BakedBot',
            subject: `SMS 10DLC Registration — ${data.legalName || orgId}`,
            htmlBody: buildEmailHtml(data, orgId),
        });
        return { success: true };
    } catch (err) {
        logger.error('[SmsRegistration] Failed to send email', { orgId, error: String(err) });
        return { success: false, error: String(err) };
    }
}

// Super user read — fetches smsRegistration from all tenants that have it
export async function getAllSmsRegistrations(): Promise<Array<{ orgId: string; data: SmsRegistrationData }>> {
    const db = getAdminFirestore();
    const snaps = await db.collection('tenants').where('smsRegistration.status', 'in', ['draft', 'ready', 'submitted']).get();
    return snaps.docs.map((doc) => ({
        orgId: doc.id,
        data: doc.data().smsRegistration as SmsRegistrationData,
    }));
}
