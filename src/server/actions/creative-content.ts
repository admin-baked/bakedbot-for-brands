'use server';

/**
 * Creative Content Server Actions
 *
 * Handles content generation, approval workflow, and publishing
 * for the Creative Command Center.
 */

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { generateImageFromPrompt } from '@/ai/flows/generate-social-image';
import { generateCreativeQR } from '@/lib/qr/creative-qr';
import type {
    CreativeContent,
    ContentStatus,
    ComplianceStatus,
    GenerateContentRequest,
    GenerateContentResponse,
    ApproveContentRequest,
    ReviseContentRequest,
    SocialPlatform,
} from '@/types/creative-content';

const COLLECTION = 'creative_content';

/**
 * Get all pending content items for approval
 */
export async function getPendingContent(tenantId: string): Promise<CreativeContent[]> {
    // Validate tenantId - return empty if not provided
    if (!tenantId) {
        logger.warn('[creative-content] getPendingContent called with empty tenantId');
        return [];
    }

    try {
        await requireUser();
    } catch (authError: any) {
        // Return empty array on auth errors - let client handle re-auth
        logger.warn('[creative-content] Auth error in getPendingContent', {
            error: authError.message
        });
        return [];
    }

    const { firestore } = await createServerClient();

    try {
        const snapshot = await firestore
            .collection(`tenants/${tenantId}/${COLLECTION}`)
            .where('status', 'in', ['pending', 'draft'])
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as CreativeContent));
    } catch (error: any) {
        logger.error('[creative-content] Failed to get pending content', {
            tenantId,
            error: error.message,
            code: error.code
        });

        // Return empty array on common non-critical errors:
        // - Missing collection (new tenant, no content yet)
        // - Missing index (needs to be created but shouldn't block UI)
        // - Permission denied (security rules blocking access)
        const nonCriticalCodes = ['not-found', 'permission-denied', 'failed-precondition'];
        const isIndexError = error.message?.includes('index');
        const isNonCritical = nonCriticalCodes.includes(error.code) || isIndexError;

        if (isNonCritical) {
            if (isIndexError) {
                logger.warn('[creative-content] Missing Firestore index - check console for creation link', {
                    tenantId
                });
            }
            return [];
        }

        // Only throw on truly unexpected errors
        throw new Error(`Failed to load creative content: ${error.message}`);
    }
}

/**
 * Get content by ID
 */
export async function getContentById(tenantId: string, contentId: string): Promise<CreativeContent | null> {
    await requireUser();
    const { firestore } = await createServerClient();

    try {
        const doc = await firestore
            .doc(`tenants/${tenantId}/${COLLECTION}/${contentId}`)
            .get();

        if (!doc.exists) return null;

        return {
            id: doc.id,
            ...doc.data()
        } as CreativeContent;
    } catch (error) {
        logger.error('[creative-content] Failed to get content', { tenantId, contentId, error });
        throw error;
    }
}

/**
 * Generate new content using AI (Craig + Nano Banana)
 */
export async function generateContent(
    request: GenerateContentRequest
): Promise<GenerateContentResponse> {
    const user = await requireUser();
    const userId = user.uid;
    const { firestore } = await createServerClient();

    logger.info('[creative-content] Generating content', {
        tenantId: request.tenantId,
        platform: request.platform,
        prompt: request.prompt.substring(0, 100)
    });

    try {
        // Generate image using Nano Banana
        const imageUrl = await generateImageFromPrompt(request.prompt, {
            brandName: request.productName,
            tier: request.tier || 'free'
        });

        // Generate caption using Craig's AI expertise
        const caption = await generateCaption(request);

        // Run Deebo compliance check on the generated caption
        const { deebo } = await import('@/server/agents/deebo');
        const complianceResult = await deebo.checkContent(
            'US', // Default jurisdiction - could be dynamic based on tenant
            mapPlatformToChannel(request.platform),
            caption
        );

        // Map Deebo result to our compliance status
        const complianceStatus: ComplianceStatus =
            complianceResult.status === 'pass' ? 'active' :
                complianceResult.status === 'warning' ? 'warning' : 'review_needed';

        // Build compliance checks array
        const complianceChecks = complianceResult.violations.map(violation => ({
            checkType: 'deebo_content_scan',
            passed: false,
            message: violation,
            checkedAt: Date.now()
        }));

        // Add a "passed" check if no violations
        if (complianceResult.status === 'pass') {
            complianceChecks.push({
                checkType: 'deebo_content_scan',
                passed: true,
                message: 'Content passed all compliance checks',
                checkedAt: Date.now()
            });
        }

        // Create content record
        const contentId = uuidv4();
        const now = Date.now();

        const content: CreativeContent = {
            id: contentId,
            tenantId: request.tenantId,
            brandId: request.brandId,
            platform: request.platform,
            status: 'pending',
            complianceStatus,
            caption,
            hashtags: request.includeHashtags ? generateHashtags(request.platform) : [],
            mediaUrls: [imageUrl],
            thumbnailUrl: imageUrl,
            mediaType: 'image',
            generatedBy: request.tier === 'free' ? 'nano-banana' : 'nano-banana-pro',
            generationPrompt: request.prompt,
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
            complianceChecks
        };

        // Save to Firestore
        await firestore
            .doc(`tenants/${request.tenantId}/${COLLECTION}/${contentId}`)
            .set(content);

        logger.info('[creative-content] Content generated successfully', {
            contentId,
            platform: request.platform,
            complianceStatus
        });

        return {
            content,
            complianceResult: {
                status: complianceStatus,
                checks: complianceChecks
            }
        };
    } catch (error) {
        logger.error('[creative-content] Failed to generate content', { error });
        throw error;
    }
}

/**
 * Approve content and optionally schedule
 */
export async function approveContent(request: ApproveContentRequest): Promise<void> {
    const user = await requireUser();
    const userId = user.uid;
    const { firestore } = await createServerClient();

    try {
        const ref = firestore.doc(`tenants/${request.tenantId}/${COLLECTION}/${request.contentId}`);
        const doc = await ref.get();

        if (!doc.exists) {
            throw new Error('Content not found');
        }

        // Generate QR code for approved content
        const qrResult = await generateCreativeQR({
            contentId: request.contentId,
            size: 512,
            baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://bakedbot.ai',
        });

        const updateData: Partial<CreativeContent> = {
            status: request.scheduledAt ? 'scheduled' : 'approved',
            complianceStatus: 'active',
            updatedAt: Date.now(),
        };

        if (request.scheduledAt) {
            updateData.scheduledAt = request.scheduledAt;
        }

        // Add QR code data if generation successful
        if (qrResult.success) {
            updateData.qrDataUrl = qrResult.qrDataUrl;
            updateData.qrSvg = qrResult.qrSvg;
            updateData.contentUrl = qrResult.contentUrl;
            updateData.qrStats = {
                scans: 0,
                scansByPlatform: {},
                scansByLocation: {},
            };
        }

        await ref.update(updateData);

        logger.info('[creative-content] Content approved', {
            contentId: request.contentId,
            approverId: userId,
            scheduled: !!request.scheduledAt,
            qrGenerated: qrResult.success,
        });
    } catch (error) {
        logger.error('[creative-content] Failed to approve content', { error });
        throw error;
    }
}

/**
 * Request revision on content
 * Triggers Craig to regenerate the caption with the revision notes
 */
export async function requestRevision(request: ReviseContentRequest): Promise<void> {
    const user = await requireUser();
    const userId = user.uid;
    const { firestore } = await createServerClient();

    try {
        const ref = firestore.doc(`tenants/${request.tenantId}/${COLLECTION}/${request.contentId}`);
        const doc = await ref.get();

        if (!doc.exists) {
            throw new Error('Content not found');
        }

        const existing = doc.data() as CreativeContent;
        const revisionNotes = existing.revisionNotes || [];

        revisionNotes.push({
            note: request.note,
            requestedBy: userId,
            requestedAt: Date.now()
        });

        // Update status to revision while regenerating
        await ref.update({
            status: 'revision',
            revisionNotes,
            updatedAt: Date.now()
        });

        logger.info('[creative-content] Revision requested, triggering Craig regeneration', {
            contentId: request.contentId,
            requesterId: userId,
            note: request.note.substring(0, 100)
        });

        // Trigger Craig to regenerate the caption with revision context
        try {
            const newCaption = await regenerateCaptionWithRevision(existing, request.note);

            // Update with new caption and move back to pending
            await ref.update({
                caption: newCaption,
                status: 'pending',
                updatedAt: Date.now()
            });

            logger.info('[creative-content] Caption regenerated successfully', {
                contentId: request.contentId
            });
        } catch (regenerateError) {
            // If regeneration fails, content stays in revision status for manual handling
            logger.warn('[creative-content] Caption regeneration failed, content remains in revision', {
                contentId: request.contentId,
                error: regenerateError
            });
        }
    } catch (error) {
        logger.error('[creative-content] Failed to request revision', { error });
        throw error;
    }
}

/**
 * Regenerate caption with revision notes using Craig AI
 */
async function regenerateCaptionWithRevision(
    existingContent: CreativeContent,
    revisionNote: string
): Promise<string> {
    try {
        const { generateSocialCaption } = await import('@/ai/flows/generate-social-caption');

        // Build context from existing content and revision request
        const revisionPrompt = `
ORIGINAL CAPTION:
${existingContent.caption}

REVISION REQUEST:
${revisionNote}

Please rewrite the caption incorporating the requested changes while maintaining the brand voice and platform best practices.
`;

        const result = await generateSocialCaption({
            platform: existingContent.platform,
            prompt: revisionPrompt,
            style: 'professional',
            includeHashtags: !!(existingContent.hashtags && existingContent.hashtags.length > 0),
            includeEmojis: true,
        });

        return result.primaryCaption;
    } catch (error) {
        logger.error('[creative-content] Failed to regenerate caption', { error });
        // Return original caption if regeneration fails
        return existingContent.caption;
    }
}

/**
 * Update caption directly (for inline editing)
 */
export async function updateCaption(
    tenantId: string,
    contentId: string,
    newCaption: string
): Promise<void> {
    await requireUser();
    const { firestore } = await createServerClient();

    try {
        const ref = firestore.doc(`tenants/${tenantId}/${COLLECTION}/${contentId}`);
        const doc = await ref.get();

        if (!doc.exists) {
            throw new Error('Content not found');
        }

        await ref.update({
            caption: newCaption,
            updatedAt: Date.now()
        });

        logger.info('[creative-content] Caption updated', {
            contentId,
            captionLength: newCaption.length
        });
    } catch (error) {
        logger.error('[creative-content] Failed to update caption', { error });
        throw error;
    }
}

/**
 * Delete content
 */
export async function deleteContent(tenantId: string, contentId: string): Promise<void> {
    await requireUser();
    const { firestore } = await createServerClient();

    try {
        await firestore
            .doc(`tenants/${tenantId}/${COLLECTION}/${contentId}`)
            .delete();

        logger.info('[creative-content] Content deleted', { tenantId, contentId });
    } catch (error) {
        logger.error('[creative-content] Failed to delete content', { error });
        throw error;
    }
}

/**
 * Update content status
 */
export async function updateContentStatus(
    tenantId: string,
    contentId: string,
    status: ContentStatus,
    complianceStatus?: ComplianceStatus
): Promise<void> {
    await requireUser();
    const { firestore } = await createServerClient();

    try {
        const updateData: Record<string, unknown> = {
            status,
            updatedAt: Date.now()
        };

        if (complianceStatus) {
            updateData.complianceStatus = complianceStatus;
        }

        await firestore
            .doc(`tenants/${tenantId}/${COLLECTION}/${contentId}`)
            .update(updateData);

        logger.info('[creative-content] Status updated', {
            contentId,
            status,
            complianceStatus
        });
    } catch (error) {
        logger.error('[creative-content] Failed to update status', { error });
        throw error;
    }
}

/**
 * Get content for a specific platform
 */
export async function getContentByPlatform(
    tenantId: string,
    platform: SocialPlatform,
    limit: number = 20
): Promise<CreativeContent[]> {
    // Validate tenantId - return empty if not provided
    if (!tenantId) {
        return [];
    }

    try {
        await requireUser();
    } catch {
        return [];
    }

    const { firestore } = await createServerClient();

    try {
        const snapshot = await firestore
            .collection(`tenants/${tenantId}/${COLLECTION}`)
            .where('platform', '==', platform)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as CreativeContent));
    } catch (error: any) {
        logger.error('[creative-content] Failed to get platform content', {
            tenantId,
            platform,
            error: error.message
        });

        // Return empty on non-critical errors (missing index, collection, permissions)
        const nonCriticalCodes = ['not-found', 'permission-denied', 'failed-precondition'];
        if (nonCriticalCodes.includes(error.code) || error.message?.includes('index')) {
            return [];
        }

        throw error;
    }
}

// --- Helper Functions ---

/**
 * Generate a caption using Craig's AI marketing expertise
 * Uses the generateSocialCaption flow for high-quality, platform-optimized captions
 */
async function generateCaption(request: GenerateContentRequest): Promise<string> {
    try {
        // Use Craig's AI-powered caption generation
        const { generateSocialCaption } = await import('@/ai/flows/generate-social-caption');

        const result = await generateSocialCaption({
            platform: request.platform,
            prompt: request.prompt,
            style: request.style || 'professional',
            brandVoice: request.brandVoice,
            productName: request.productName,
            targetAudience: request.targetAudience,
            includeHashtags: false, // We handle hashtags separately
            includeEmojis: true,
        });

        return result.primaryCaption;
    } catch (error) {
        // Fallback to simple templates if AI generation fails
        logger.warn('[creative-content] AI caption generation failed, using fallback', { error });
        return generateFallbackCaption(request);
    }
}

/**
 * Fallback caption generation when AI is unavailable
 */
function generateFallbackCaption(request: GenerateContentRequest): string {
    const style = request.style || 'professional';

    const templates: Record<string, string[]> = {
        professional: [
            `${request.productName || 'Check out'} our latest offering. Quality you can trust.`,
            `Elevate your experience with ${request.productName || 'premium products'}.`
        ],
        playful: [
            `${request.productName || 'This'} hits different!`,
            `Ready to elevate your day? ${request.productName || 'We got you'}`
        ],
        educational: [
            `Did you know? ${request.productName || 'Our products'} are crafted with care and precision.`,
            `Learn more about ${request.productName || 'quality cannabis'} and its benefits.`
        ],
        hype: [
            `NEW DROP ALERT: ${request.productName || 'Something amazing'} is here!`,
            `This one's going to sell out fast! ${request.productName || ''}`
        ]
    };

    const options = templates[style] || templates.professional;
    return options[Math.floor(Math.random() * options.length)];
}

/**
 * Generate platform-specific hashtags
 */
function generateHashtags(platform: SocialPlatform): string[] {
    const baseHashtags = ['#cannabis', '#dispensary', '#cannabiscommunity'];

    const platformHashtags: Record<SocialPlatform, string[]> = {
        instagram: ['#weedstagram', '#420', '#cannabisculture', '#stonernation'],
        tiktok: ['#cannatok', '#420tok', '#weedtok'],
        linkedin: ['#cannabisindustry', '#cannabisbusiness', '#greenrush'],
        twitter: ['#MedicalCannabis', '#Legalization'],
        facebook: ['#LocalDispensary', '#ShopLocal']
    };

    return [...baseHashtags, ...(platformHashtags[platform] || [])].slice(0, 10);
}

/**
 * Map social platform to Deebo channel type for compliance checks
 */
function mapPlatformToChannel(platform: SocialPlatform): string {
    const channelMap: Record<SocialPlatform, string> = {
        instagram: 'social',
        tiktok: 'social',
        linkedin: 'social',
        twitter: 'social',
        facebook: 'social'
    };
    return channelMap[platform] || 'social';
}
