'use server';

/**
 * Lead Capture Server Actions
 *
 * Handles email capture for the public vibe generator tool.
 * Stores leads in Firestore for follow-up via email nurture and manual outreach.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

const LEADS_COLLECTION = 'leads';

export interface LeadData {
    id: string;
    email: string;
    name?: string;
    company?: string;
    phone?: string;
    industry?: 'cannabis' | 'cbd' | 'wellness' | 'retail' | 'other';
    source: 'vibe-generator' | 'vibe-templates' | 'mobile-vibe' | 'download' | 'other';
    platformInterest: 'web' | 'mobile' | 'both';

    // Engagement tracking
    vibesGenerated: number;
    lastVibeId?: string;
    lastVibeName?: string;
    refinementCount: number;
    downloadedPackage: boolean;

    // Intent signals
    highIntent: boolean;
    intentSignals: string[];

    // UTM tracking
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    lastActivityAt: Date;

    // Follow-up status
    emailNurtureSent: boolean;
    manualOutreachSent: boolean;
    convertedToUser: boolean;
    convertedUserId?: string;
}

export interface CaptureEmailInput {
    email: string;
    name?: string;
    company?: string;
    phone?: string;
    industry?: 'cannabis' | 'cbd' | 'wellness' | 'retail' | 'other';
    source: 'vibe-generator' | 'vibe-templates' | 'mobile-vibe' | 'download' | 'other';
    platformInterest?: 'web' | 'mobile' | 'both';
    vibeId?: string;
    vibeName?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
}

/**
 * Capture a new lead or update existing lead
 */
export async function captureEmail(input: CaptureEmailInput): Promise<{
    success: boolean;
    leadId?: string;
    isNewLead?: boolean;
    error?: string;
}> {
    try {
        const db = getAdminFirestore();
        const email = input.email.toLowerCase().trim();

        // Validate email
        if (!email || !email.includes('@')) {
            return { success: false, error: 'Valid email is required' };
        }

        // Check if lead already exists
        const existingQuery = await db.collection(LEADS_COLLECTION)
            .where('email', '==', email)
            .limit(1)
            .get();

        const now = new Date();

        if (!existingQuery.empty) {
            // Update existing lead
            const existingDoc = existingQuery.docs[0];
            const existingData = existingDoc.data() as LeadData;

            const updates: Partial<LeadData> = {
                updatedAt: now,
                lastActivityAt: now,
                vibesGenerated: (existingData.vibesGenerated || 0) + 1,
            };

            if (input.vibeId) {
                updates.lastVibeId = input.vibeId;
            }
            if (input.vibeName) {
                updates.lastVibeName = input.vibeName;
            }
            if (input.name && !existingData.name) {
                updates.name = input.name;
            }
            if (input.company && !existingData.company) {
                updates.company = input.company;
            }
            if (input.phone && !existingData.phone) {
                updates.phone = input.phone;
            }
            if (input.industry && !existingData.industry) {
                updates.industry = input.industry;
            }

            // Update platform interest if mobile is now included
            if (input.platformInterest === 'mobile' || input.platformInterest === 'both') {
                if (existingData.platformInterest === 'web') {
                    updates.platformInterest = 'both';
                } else if (!existingData.platformInterest) {
                    updates.platformInterest = input.platformInterest;
                }
            }

            await existingDoc.ref.update(updates);

            logger.info('[LEADS] Updated existing lead', {
                email,
                leadId: existingDoc.id,
                source: input.source
            });

            return { success: true, leadId: existingDoc.id, isNewLead: false };
        }

        // Create new lead
        const id = uuidv4();
        const newLead: LeadData = {
            id,
            email,
            name: input.name,
            company: input.company,
            phone: input.phone,
            industry: input.industry,
            source: input.source,
            platformInterest: input.platformInterest || 'web',
            vibesGenerated: 1,
            lastVibeId: input.vibeId,
            lastVibeName: input.vibeName,
            refinementCount: 0,
            downloadedPackage: false,
            highIntent: false,
            intentSignals: [],
            utmSource: input.utmSource,
            utmMedium: input.utmMedium,
            utmCampaign: input.utmCampaign,
            createdAt: now,
            updatedAt: now,
            lastActivityAt: now,
            emailNurtureSent: false,
            manualOutreachSent: false,
            convertedToUser: false,
        };

        await db.collection(LEADS_COLLECTION).doc(id).set(newLead);

        logger.info('[LEADS] Captured new lead', {
            email,
            leadId: id,
            source: input.source,
            platformInterest: newLead.platformInterest,
        });

        return { success: true, leadId: id, isNewLead: true };
    } catch (error) {
        logger.error('[LEADS] Failed to capture email', {
            error: error instanceof Error ? error.message : String(error)
        });
        return { success: false, error: 'Failed to capture email' };
    }
}

/**
 * Track lead activity (vibe generation, refinement, etc.)
 */
export async function trackLeadActivity(
    email: string,
    activity: {
        type: 'vibe_generated' | 'vibe_refined' | 'mobile_generated' | 'package_downloaded' | 'preset_selected';
        vibeId?: string;
        vibeName?: string;
        platform?: 'web' | 'mobile' | 'both';
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminFirestore();
        const normalizedEmail = email.toLowerCase().trim();

        const existingQuery = await db.collection(LEADS_COLLECTION)
            .where('email', '==', normalizedEmail)
            .limit(1)
            .get();

        if (existingQuery.empty) {
            // Lead not found - they may not have submitted email yet
            return { success: true };
        }

        const doc = existingQuery.docs[0];
        const data = doc.data() as LeadData;
        const now = new Date();

        const updates: Partial<LeadData> = {
            updatedAt: now,
            lastActivityAt: now,
        };

        // Update based on activity type
        switch (activity.type) {
            case 'vibe_generated':
            case 'mobile_generated':
                updates.vibesGenerated = (data.vibesGenerated || 0) + 1;
                if (activity.vibeId) updates.lastVibeId = activity.vibeId;
                if (activity.vibeName) updates.lastVibeName = activity.vibeName;
                break;

            case 'vibe_refined':
                updates.refinementCount = (data.refinementCount || 0) + 1;
                break;

            case 'package_downloaded':
                updates.downloadedPackage = true;
                break;
        }

        // Update platform interest
        if (activity.platform === 'mobile' && data.platformInterest === 'web') {
            updates.platformInterest = 'both';
        }

        // Calculate intent signals
        const newVibesGenerated = updates.vibesGenerated || data.vibesGenerated || 0;
        const newRefinementCount = updates.refinementCount || data.refinementCount || 0;
        const downloadedPackage = updates.downloadedPackage || data.downloadedPackage;

        const intentSignals: string[] = [...(data.intentSignals || [])];

        if (newVibesGenerated >= 2 && !intentSignals.includes('multiple_vibes')) {
            intentSignals.push('multiple_vibes');
        }
        if (newRefinementCount >= 3 && !intentSignals.includes('heavy_refinement')) {
            intentSignals.push('heavy_refinement');
        }
        if (downloadedPackage && !intentSignals.includes('downloaded')) {
            intentSignals.push('downloaded');
        }
        if (activity.type === 'mobile_generated' && !intentSignals.includes('mobile_interest')) {
            intentSignals.push('mobile_interest');
        }

        updates.intentSignals = intentSignals;
        updates.highIntent = intentSignals.length >= 2;

        await doc.ref.update(updates);

        logger.info('[LEADS] Tracked activity', {
            email: normalizedEmail,
            activity: activity.type,
            highIntent: updates.highIntent,
        });

        return { success: true };
    } catch (error) {
        logger.error('[LEADS] Failed to track activity', {
            error: error instanceof Error ? error.message : String(error)
        });
        return { success: false, error: 'Failed to track activity' };
    }
}

/**
 * Get lead by email (for checking if email exists)
 */
export async function getLeadByEmail(email: string): Promise<{
    success: boolean;
    exists: boolean;
    lead?: LeadData;
    error?: string;
}> {
    try {
        const db = getAdminFirestore();
        const normalizedEmail = email.toLowerCase().trim();

        const query = await db.collection(LEADS_COLLECTION)
            .where('email', '==', normalizedEmail)
            .limit(1)
            .get();

        if (query.empty) {
            return { success: true, exists: false };
        }

        const data = query.docs[0].data() as LeadData;
        return { success: true, exists: true, lead: data };
    } catch (error) {
        logger.error('[LEADS] Failed to get lead', {
            error: error instanceof Error ? error.message : String(error)
        });
        return { success: false, exists: false, error: 'Failed to get lead' };
    }
}

/**
 * Mark lead as converted when they sign up
 */
export async function markLeadConverted(
    email: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminFirestore();
        const normalizedEmail = email.toLowerCase().trim();

        const query = await db.collection(LEADS_COLLECTION)
            .where('email', '==', normalizedEmail)
            .limit(1)
            .get();

        if (query.empty) {
            return { success: true }; // No lead to update
        }

        await query.docs[0].ref.update({
            convertedToUser: true,
            convertedUserId: userId,
            updatedAt: new Date(),
        });

        logger.info('[LEADS] Marked lead as converted', { email: normalizedEmail, userId });

        return { success: true };
    } catch (error) {
        logger.error('[LEADS] Failed to mark converted', {
            error: error instanceof Error ? error.message : String(error)
        });
        return { success: false, error: 'Failed to mark converted' };
    }
}
