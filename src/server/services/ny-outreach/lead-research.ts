/**
 * NY Dispensary Lead Research Service
 *
 * Manages the lead research pipeline:
 * - Creates/updates the NY Outreach spreadsheet on BakedBot Drive
 * - Logs leads, outreach results, bad emails, and unreachable dispensaries
 * - Integrates with Google Sheets for the tracking spreadsheet
 */

import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';

const SPREADSHEET_DOC_ID = 'ny-outreach-tracker';
const OUTREACH_COLLECTION = 'ny_outreach_log';

export interface ResearchedLead {
    dispensaryName: string;
    contactName?: string;
    email?: string;
    phone?: string;
    city: string;
    state: string;
    address?: string;
    websiteUrl?: string;
    contactFormUrl?: string;
    posSystem?: string;
    licenseType?: string;
    licenseNumber?: string;
    source: string;
    researchedAt: number;
    notes?: string;
}

/**
 * Save researched leads to Firestore for tracking and spreadsheet sync.
 */
export async function saveResearchedLeads(leads: ResearchedLead[]): Promise<string[]> {
    const db = getAdminFirestore();
    const batch = db.batch();
    const ids: string[] = [];

    for (const lead of leads) {
        const docRef = db.collection('ny_dispensary_leads').doc();
        batch.set(docRef, {
            dispensaryName: lead.dispensaryName,
            contactName: lead.contactName || null,
            email: lead.email || null,
            phone: lead.phone || null,
            city: lead.city,
            state: lead.state,
            address: lead.address || null,
            websiteUrl: lead.websiteUrl || null,
            contactFormUrl: lead.contactFormUrl || null,
            posSystem: lead.posSystem || null,
            licenseType: lead.licenseType || null,
            licenseNumber: lead.licenseNumber || null,
            source: lead.source,
            researchedAt: lead.researchedAt,
            notes: lead.notes || null,
            status: 'researched',
            emailVerified: false,
            outreachSent: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        ids.push(docRef.id);
    }

    await batch.commit();
    logger.info('[LeadResearch] Saved researched leads', { count: leads.length });
    return ids;
}

/**
 * Get all leads for the spreadsheet export.
 */
export async function getLeadsForSpreadsheet(): Promise<{
    headers: string[];
    rows: string[][];
}> {
    const db = getAdminFirestore();

    // Get all leads
    const leadsSnapshot = await db.collection('ny_dispensary_leads')
        .orderBy('createdAt', 'desc')
        .limit(500)
        .get();

    // Get outreach log for status
    const outreachSnapshot = await db.collection(OUTREACH_COLLECTION)
        .orderBy('timestamp', 'desc')
        .limit(500)
        .get();

    // Build email → outreach status map
    const outreachByEmail = new Map<string, {
        status: string;
        templateId: string;
        emailVerified: boolean;
        sentAt: number;
        error?: string;
    }>();

    outreachSnapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        const data = doc.data();
        if (data.email && !outreachByEmail.has(data.email)) {
            outreachByEmail.set(data.email, {
                status: data.status || 'unknown',
                templateId: data.templateId || '',
                emailVerified: data.emailVerified || false,
                sentAt: data.timestamp || 0,
                error: data.sendError || undefined,
            });
        }
    });

    const headers = [
        'Dispensary Name',
        'Contact Name',
        'Email',
        'Phone',
        'City',
        'State',
        'Address',
        'Website',
        'Contact Form',
        'POS System',
        'License Type',
        'Source',
        'Email Verified',
        'Outreach Status',
        'Template Used',
        'Error/Notes',
        'Researched Date',
        'Last Updated',
    ];

    const rows = leadsSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        const lead = doc.data();
        const outreach = lead.email ? outreachByEmail.get(lead.email) : undefined;
        const researchedDate = lead.researchedAt ? new Date(lead.researchedAt).toLocaleDateString() : '';
        const updatedDate = lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : '';

        return [
            lead.dispensaryName || '',
            lead.contactName || '',
            lead.email || '',
            lead.phone || '',
            lead.city || '',
            lead.state || '',
            lead.address || '',
            lead.websiteUrl || '',
            lead.contactFormUrl || '',
            lead.posSystem || '',
            lead.licenseType || '',
            lead.source || '',
            outreach?.emailVerified ? 'Yes' : lead.emailVerified ? 'Yes' : 'No',
            outreach?.status || lead.status || 'pending',
            outreach?.templateId || '',
            outreach?.error || lead.notes || '',
            researchedDate,
            updatedDate,
        ];
    });

    return { headers, rows };
}

/**
 * Sync outreach data to a BakedBot Drive document.
 * Creates or updates the tracking spreadsheet.
 */
export async function syncToDriverSpreadsheet(): Promise<{ docId: string; rowCount: number }> {
    const db = getAdminFirestore();
    const { headers, rows } = await getLeadsForSpreadsheet();

    // Store as a Drive document in Firestore
    const docRef = db.collection('drive_files').doc(SPREADSHEET_DOC_ID);
    const existing = await docRef.get();

    const driveData = {
        id: SPREADSHEET_DOC_ID,
        name: 'NY Dispensary Outreach Tracker',
        type: 'spreadsheet',
        mimeType: 'application/vnd.bakedbot.spreadsheet',
        content: JSON.stringify({ headers, rows }),
        metadata: {
            totalLeads: rows.length,
            lastSyncedAt: Date.now(),
            sheetName: 'Outreach Log',
        },
        updatedAt: Date.now(),
        updatedBy: 'system',
        tags: ['ny-outreach', 'leads', 'tracking'],
    };

    if (existing.exists) {
        await docRef.update(driveData);
    } else {
        await docRef.set({
            ...driveData,
            createdAt: Date.now(),
            createdBy: 'system',
            orgId: 'system',
            folderId: 'outreach',
        });
    }

    logger.info('[LeadResearch] Synced to Drive spreadsheet', {
        docId: SPREADSHEET_DOC_ID,
        rowCount: rows.length,
    });

    return { docId: SPREADSHEET_DOC_ID, rowCount: rows.length };
}
