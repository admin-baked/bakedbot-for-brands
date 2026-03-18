import { getAdminFirestore } from '@/firebase/admin';

const OUTREACH_COLLECTION = 'ny_outreach_log';

export interface OutreachResult {
    leadId: string;
    dispensaryName: string;
    email: string;
    templateId: string;
    emailVerified: boolean;
    verificationResult?: string;
    emailSent: boolean;
    sendError?: string;
    timestamp: number;
    action?: string;
}

export interface OutreachStats {
    totalSent: number;
    totalFailed: number;
    totalBadEmails: number;
    totalPending: number;
    recentResults: OutreachResult[];
}

export async function getOutreachStats(since?: number): Promise<OutreachStats> {
    const db = getAdminFirestore();
    const sinceTimestamp = since || Date.now() - (12 * 60 * 60 * 1000);

    const snapshot = await db.collection(OUTREACH_COLLECTION)
        .where('timestamp', '>=', sinceTimestamp)
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();

    const results = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot): OutreachResult => {
        const d = doc.data();
        return {
            leadId: doc.id,
            dispensaryName: typeof d.dispensaryName === 'string' ? d.dispensaryName : '',
            email: typeof d.email === 'string' ? d.email : '',
            templateId: typeof d.templateId === 'string' ? d.templateId : '',
            emailVerified: d.emailVerified === true,
            verificationResult: typeof d.verificationResult === 'string' ? d.verificationResult : undefined,
            emailSent: d.emailSent === true,
            sendError: typeof d.sendError === 'string' ? d.sendError : undefined,
            timestamp: typeof d.timestamp === 'number' ? d.timestamp : Date.now(),
            action: typeof d.action === 'string' ? d.action : undefined,
        };
    });

    return {
        totalSent: results.filter((result) => result.emailSent).length,
        totalFailed: results.filter((result) => !result.emailSent && result.emailVerified).length,
        totalBadEmails: results.filter((result) => !result.emailVerified).length,
        totalPending: 0,
        recentResults: results.slice(0, 20),
    };
}
