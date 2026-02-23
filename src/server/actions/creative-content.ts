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
    ApprovalRecord,
    ApprovalState,
    ApprovalChain,
} from '@/types/creative-content';

const COLLECTION = 'creative_content';

/**
 * Pagination options for content queries
 */
export interface ContentPaginationOptions {
    limit?: number;
    startAfter?: string; // Document ID to start after
    orderBy?: 'createdAt' | 'updatedAt';
    orderDirection?: 'asc' | 'desc';
}

/**
 * Paginated content response
 */
export interface PaginatedContentResponse {
    content: CreativeContent[];
    hasMore: boolean;
    lastDocId?: string;
    total?: number;
}

/**
 * Get all pending content items for approval with pagination
 */
export async function getPendingContent(
    tenantId: string,
    options: ContentPaginationOptions = {}
): Promise<PaginatedContentResponse> {
    const {
        limit = 50,
        startAfter,
        orderBy = 'createdAt',
        orderDirection = 'desc'
    } = options;

    // Validate tenantId - return empty if not provided
    if (!tenantId) {
        logger.warn('[creative-content] getPendingContent called with empty tenantId');
        return { content: [], hasMore: false };
    }

    try {
        await requireUser();
    } catch (authError: any) {
        // Return empty array on auth errors - let client handle re-auth
        logger.warn('[creative-content] Auth error in getPendingContent', {
            error: authError.message
        });
        return { content: [], hasMore: false };
    }

    const { firestore } = await createServerClient();

    try {
        let query = firestore
            .collection(`tenants/${tenantId}/${COLLECTION}`)
            .where('status', 'in', ['pending', 'draft'])
            .orderBy(orderBy, orderDirection);

        // Apply cursor if provided
        if (startAfter) {
            const startDoc = await firestore
                .doc(`tenants/${tenantId}/${COLLECTION}/${startAfter}`)
                .get();

            if (startDoc.exists) {
                query = query.startAfter(startDoc);
            }
        }

        // Fetch one extra to check if there are more pages
        const snapshot = await query.limit(limit + 1).get();

        const hasMore = snapshot.docs.length > limit;
        const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

        const content = docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as CreativeContent));

        const lastDocId = docs.length > 0 ? docs[docs.length - 1].id : undefined;

        return {
            content,
            hasMore,
            lastDocId,
        };
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
            return { content: [], hasMore: false };
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
 * Get public content by ID (no auth required - for QR landing pages)
 * Only returns approved/scheduled/published content
 */
export async function getPublicContentById(contentId: string): Promise<CreativeContent | null> {
    const { firestore } = await createServerClient();

    try {
        // Search across all tenants for this content ID
        // This is safe because we only return public (approved+) content
        const tenantsSnapshot = await firestore
            .collection('tenants')
            .listDocuments();

        for (const tenantRef of tenantsSnapshot) {
            const doc = await firestore
                .doc(`${tenantRef.path}/${COLLECTION}/${contentId}`)
                .get();

            if (doc.exists) {
                const content = {
                    id: doc.id,
                    ...doc.data()
                } as CreativeContent;

                // Only return if content is approved, scheduled, or published
                if (['approved', 'scheduled', 'published'].includes(content.status)) {
                    return content;
                }
            }
        }

        return null;
    } catch (error) {
        logger.error('[creative-content] Failed to get public content', { contentId, error });
        return null;
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

    // Placeholder used when image generation fails or is unavailable
    const IMAGE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjgwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWExYTJlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPkltYWdlIGdlbmVyYXRpbmcuLi48L3RleHQ+PC9zdmc+';

    try {
        // Build a visual-first image prompt (imageStyle leads; marketing copy goes to caption only)
        const imagePrompt = deriveImagePrompt(request);

        // Run image generation + caption generation in parallel to save time
        const [imageUrl, caption] = await Promise.all([
            generateImageFromPrompt(imagePrompt, {
                brandName: request.productName,
                tier: request.tier || 'free',
                platform: request.platform,  // Pass platform for correct aspect ratio
            }).catch((imgErr) => {
                // Image generation can fail (model unavailable, safety filter, timeout)
                // Fall back gracefully — content is still usable without the image
                logger.warn('[creative-content] Image generation failed, using placeholder', {
                    error: String(imgErr),
                    prompt: request.prompt.substring(0, 80)
                });
                return IMAGE_PLACEHOLDER;
            }),
            generateCaption(request).catch((captionErr) => {
                // Caption generation can fail (AI service unavailable, API rate limits, etc.)
                // Fall back gracefully — use a default caption template
                logger.warn('[creative-content] Caption generation failed, using fallback', {
                    error: String(captionErr),
                    prompt: request.prompt.substring(0, 80)
                });
                return generateFallbackCaption(request);
            }),
        ]);

        // Run Deebo compliance check on the generated caption (with fallback)
        let complianceStatus: ComplianceStatus = 'active';
        let complianceChecks: { checkType: string; passed: boolean; message: string; checkedAt: number }[] = [];
        try {
            const { deebo } = await import('@/server/agents/deebo');
            const complianceResult = await deebo.checkContent(
                'US', // Default jurisdiction - could be dynamic based on tenant
                mapPlatformToChannel(request.platform),
                caption
            );

            complianceStatus =
                complianceResult.status === 'pass' ? 'active' :
                    complianceResult.status === 'warning' ? 'warning' : 'review_needed';

            complianceChecks = complianceResult.violations.map(violation => ({
                checkType: 'deebo_content_scan',
                passed: false,
                message: violation,
                checkedAt: Date.now()
            }));

            if (complianceResult.status === 'pass') {
                complianceChecks.push({
                    checkType: 'deebo_content_scan',
                    passed: true,
                    message: 'Content passed all compliance checks',
                    checkedAt: Date.now()
                });
            }
        } catch (deeboErr) {
            // Deebo unavailable — default to pending review, don't block content creation
            logger.warn('[creative-content] Deebo compliance check failed, defaulting to warning', {
                error: String(deeboErr)
            });
            complianceStatus = 'warning';
            complianceChecks = [{
                checkType: 'deebo_content_scan',
                passed: false,
                message: 'Compliance check unavailable — manual review required',
                checkedAt: Date.now()
            }];
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
            generatedBy: request.tier === 'free' ? 'flux-schnell' : 'flux-pro',
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
 *
 * CRITICAL: Server-side compliance gate — blocks publish if Deebo check fails
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

        const content = doc.data() as CreativeContent;

        // ========== COMPLIANCE GATE (SERVER-SIDE ENFORCEMENT) ==========
        // Re-run Deebo compliance check at approval time (can't trust client-side badge)
        // Block approval if content fails compliance
        try {
            const { deebo } = await import('@/server/agents/deebo');
            const complianceResult = await deebo.checkContent(
                'US', // TODO: Get jurisdiction from tenant settings
                mapPlatformToChannel(content.platform),
                content.caption
            );

            if (complianceResult.status === 'fail') {
                logger.warn('[creative-content] Approval blocked — content failed Deebo compliance check', {
                    contentId: request.contentId,
                    violations: complianceResult.violations,
                });
                throw new Error(
                    `Content failed compliance check: ${complianceResult.violations.join(', ')}`
                );
            }

            if (complianceResult.status === 'warning') {
                logger.info('[creative-content] Content approved with compliance warnings', {
                    contentId: request.contentId,
                    warnings: complianceResult.violations,
                });
            }
        } catch (deeboErr) {
            // If Deebo is unavailable, BLOCK the approval (fail-safe)
            logger.error('[creative-content] Deebo compliance check failed — blocking approval', {
                contentId: request.contentId,
                error: String(deeboErr),
            });
            throw new Error(
                'Compliance check unavailable. Cannot approve content without compliance verification.'
            );
        }
        // ===============================================================

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
 * Publish content (with compliance enforcement)
 *
 * CRITICAL: Server-side compliance gate — blocks publish if Deebo check fails
 */
export async function publishContent(
    tenantId: string,
    contentId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await requireUser();
        const { firestore } = await createServerClient();

        const ref = firestore.doc(`tenants/${tenantId}/${COLLECTION}/${contentId}`);
        const doc = await ref.get();

        if (!doc.exists) {
            return { success: false, error: 'Content not found' };
        }

        const content = doc.data() as CreativeContent;

        // ========== COMPLIANCE GATE (SERVER-SIDE ENFORCEMENT) ==========
        // Re-run Deebo compliance check at publish time
        // Block publish if content fails compliance
        try {
            const { deebo } = await import('@/server/agents/deebo');
            const complianceResult = await deebo.checkContent(
                'US', // TODO: Get jurisdiction from tenant settings
                mapPlatformToChannel(content.platform),
                content.caption
            );

            if (complianceResult.status === 'fail') {
                logger.warn('[creative-content] Publish blocked — content failed Deebo compliance check', {
                    contentId,
                    violations: complianceResult.violations,
                });
                return {
                    success: false,
                    error: `Content failed compliance check: ${complianceResult.violations.join(', ')}`,
                };
            }

            if (complianceResult.status === 'warning') {
                logger.info('[creative-content] Content published with compliance warnings', {
                    contentId,
                    warnings: complianceResult.violations,
                });
            }
        } catch (deeboErr) {
            // If Deebo is unavailable, BLOCK the publish (fail-safe)
            logger.error('[creative-content] Deebo compliance check failed — blocking publish', {
                contentId,
                error: String(deeboErr),
            });
            return {
                success: false,
                error: 'Compliance check unavailable. Cannot publish content without compliance verification.',
            };
        }
        // ===============================================================

        // Update status to published
        await ref.update({
            status: 'published',
            publishedAt: new Date().toISOString(),
            updatedAt: Date.now(),
        });

        logger.info('[creative-content] Content published', {
            contentId,
            platform: content.platform,
        });

        return { success: true };
    } catch (error) {
        logger.error('[creative-content] Failed to publish content', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to publish content',
        };
    }
}

/**
 * Get content for a specific platform with pagination
 */
export async function getContentByPlatform(
    tenantId: string,
    platform: SocialPlatform,
    options: ContentPaginationOptions = {}
): Promise<PaginatedContentResponse> {
    const {
        limit = 20,
        startAfter,
        orderBy = 'createdAt',
        orderDirection = 'desc'
    } = options;

    // Validate tenantId - return empty if not provided
    if (!tenantId) {
        return { content: [], hasMore: false };
    }

    try {
        await requireUser();
    } catch {
        return { content: [], hasMore: false };
    }

    const { firestore } = await createServerClient();

    try {
        let query = firestore
            .collection(`tenants/${tenantId}/${COLLECTION}`)
            .where('platform', '==', platform)
            .orderBy(orderBy, orderDirection);

        // Apply cursor if provided
        if (startAfter) {
            const startDoc = await firestore
                .doc(`tenants/${tenantId}/${COLLECTION}/${startAfter}`)
                .get();

            if (startDoc.exists) {
                query = query.startAfter(startDoc);
            }
        }

        // Fetch one extra to check if there are more pages
        const snapshot = await query.limit(limit + 1).get();

        const hasMore = snapshot.docs.length > limit;
        const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

        const content = docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as CreativeContent));

        const lastDocId = docs.length > 0 ? docs[docs.length - 1].id : undefined;

        return {
            content,
            hasMore,
            lastDocId,
        };
    } catch (error: any) {
        logger.error('[creative-content] Failed to get platform content', {
            tenantId,
            platform,
            error: error.message
        });

        // Return empty on non-critical errors (missing index, collection, permissions)
        const nonCriticalCodes = ['not-found', 'permission-denied', 'failed-precondition'];
        if (nonCriticalCodes.includes(error.code) || error.message?.includes('index')) {
            return { content: [], hasMore: false };
        }

        throw error;
    }
}

// --- Helper Functions ---

/**
 * Build a visual-first image prompt for FLUX.1.
 *
 * Separates visual style from marketing copy — FLUX.1 needs a visual descriptor
 * (lighting, mood, style, subject) NOT marketing text ("announcement", "details").
 *
 * Priority order:
 *   1. imageStyle (e.g. "warm ambient lifestyle photography, golden hour light")
 *   2. productName as subject anchor
 *   3. Fallback: first clause of prompt if no imageStyle provided
 */
function deriveImagePrompt(request: GenerateContentRequest): string {
    const parts: string[] = [];

    // 1. Visual style description FIRST — FLUX.1 weights early tokens most heavily
    if (request.imageStyle) {
        parts.push(request.imageStyle);
    }

    // 2. Product name as subject anchor
    if (request.productName) {
        parts.push(`${request.productName} cannabis product`);
    } else {
        parts.push('cannabis dispensary lifestyle');
    }

    // 3. When no imageStyle, extract first visual clause from the prompt as fallback
    if (!request.imageStyle) {
        const firstClause = request.prompt
            .split(/[.\n]/)[0]
            .replace(/#\w+/g, '')
            .replace(/\b(announcement|highlighting|featuring|focusing on|registration|information|messaging|details?|promotion)\b/gi, '')
            .trim();
        if (firstClause) parts.push(firstClause);
    }

    return parts.filter(Boolean).join(', ');
}

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

// ==================== APPROVAL CHAIN FUNCTIONS ====================

/**
 * Approve content at current approval level
 */
export async function approveAtLevel(
    contentId: string,
    tenantId: string,
    approverId: string,
    approverName: string,
    approverRole: string,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        const contentRef = firestore.collection(`tenants/${tenantId}/${COLLECTION}`).doc(contentId);

        const contentDoc = await contentRef.get();
        if (!contentDoc.exists) {
            return { success: false, error: 'Content not found' };
        }

        const content = contentDoc.data() as CreativeContent;
        const approvalState = content.approvalState;

        if (!approvalState) {
            return { success: false, error: 'No approval chain configured for this content' };
        }

        // Check if user already approved at this level
        const alreadyApproved = approvalState.approvals.some(
            (a) => a.approverId === approverId && a.level === approvalState.currentLevel
        );

        if (alreadyApproved) {
            return { success: false, error: 'You have already approved at this level' };
        }

        // Check if user has required role
        if (!approvalState.nextRequiredRoles.includes(approverRole)) {
            return { success: false, error: 'You do not have permission to approve at this level' };
        }

        // Create approval record
        const approvalRecord: ApprovalRecord = {
            id: uuidv4(),
            level: approvalState.currentLevel,
            approverId,
            approverName,
            approverRole,
            action: 'approved',
            notes,
            timestamp: Date.now(),
            required: true,
        };

        // Add approval to list
        const updatedApprovals = [...approvalState.approvals, approvalRecord];

        // Check if we need to advance to next level
        // For now, assume 1 approval per level is enough (can be configurable)
        const approvalsAtCurrentLevel = updatedApprovals.filter(
            (a) => a.level === approvalState.currentLevel && a.action === 'approved'
        );

        let updatedState: ApprovalState;
        const maxLevel = 3; // Default max levels (can be from chain config)

        if (approvalsAtCurrentLevel.length >= 1) {
            // Advance to next level or mark as approved
            if (approvalState.currentLevel >= maxLevel) {
                // All levels complete - mark as approved
                updatedState = {
                    ...approvalState,
                    approvals: updatedApprovals,
                    status: 'approved',
                    nextRequiredRoles: [],
                };

                // Update content status to approved
                await contentRef.update({
                    approvalState: updatedState,
                    status: 'approved',
                    updatedAt: Date.now(),
                });
            } else {
                // Advance to next level
                const nextLevel = approvalState.currentLevel + 1;
                const nextRoles = getRequiredRolesForLevel(nextLevel);

                updatedState = {
                    ...approvalState,
                    currentLevel: nextLevel,
                    approvals: updatedApprovals,
                    status: 'pending_approval',
                    nextRequiredRoles: nextRoles,
                };

                await contentRef.update({
                    approvalState: updatedState,
                    updatedAt: Date.now(),
                });
            }
        } else {
            // Just add the approval, stay at current level
            updatedState = {
                ...approvalState,
                approvals: updatedApprovals,
            };

            await contentRef.update({
                approvalState: updatedState,
                updatedAt: Date.now(),
            });
        }

        logger.info('[approveAtLevel] Content approved', {
            contentId,
            level: approvalState.currentLevel,
            approverId,
        });

        return { success: true };
    } catch (error: unknown) {
        logger.error('[approveAtLevel] Error:', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to approve content',
        };
    }
}

/**
 * Reject content at current approval level
 */
export async function rejectAtLevel(
    contentId: string,
    tenantId: string,
    approverId: string,
    approverName: string,
    approverRole: string,
    notes: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        const contentRef = firestore.collection(`tenants/${tenantId}/${COLLECTION}`).doc(contentId);

        const contentDoc = await contentRef.get();
        if (!contentDoc.exists) {
            return { success: false, error: 'Content not found' };
        }

        const content = contentDoc.data() as CreativeContent;
        const approvalState = content.approvalState;

        if (!approvalState) {
            return { success: false, error: 'No approval chain configured for this content' };
        }

        // Check if user has required role
        if (!approvalState.nextRequiredRoles.includes(approverRole)) {
            return { success: false, error: 'You do not have permission to reject at this level' };
        }

        // Create rejection record
        const rejectionRecord: ApprovalRecord = {
            id: uuidv4(),
            level: approvalState.currentLevel,
            approverId,
            approverName,
            approverRole,
            action: 'rejected',
            notes,
            timestamp: Date.now(),
            required: true,
        };

        // Add rejection to list and mark as rejected
        const updatedState: ApprovalState = {
            ...approvalState,
            approvals: [...approvalState.approvals, rejectionRecord],
            status: 'rejected',
            rejectionReason: notes,
            nextRequiredRoles: [],
        };

        await contentRef.update({
            approvalState: updatedState,
            status: 'revision', // Send back for revision
            updatedAt: Date.now(),
        });

        logger.info('[rejectAtLevel] Content rejected', {
            contentId,
            level: approvalState.currentLevel,
            approverId,
        });

        return { success: true };
    } catch (error: unknown) {
        logger.error('[rejectAtLevel] Error:', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to reject content',
        };
    }
}

/**
 * Initialize approval chain for content
 */
export async function initializeApprovalChain(
    contentId: string,
    tenantId: string,
    chainId?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        const contentRef = firestore.collection(`tenants/${tenantId}/${COLLECTION}`).doc(contentId);

        // Initialize with default 3-level approval
        const initialState: ApprovalState = {
            chainId,
            currentLevel: 1,
            approvals: [],
            status: 'pending_approval',
            nextRequiredRoles: getRequiredRolesForLevel(1),
        };

        await contentRef.update({
            approvalState: initialState,
            updatedAt: Date.now(),
        });

        logger.info('[initializeApprovalChain] Approval chain initialized', { contentId, chainId });
        return { success: true };
    } catch (error: unknown) {
        logger.error('[initializeApprovalChain] Error:', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to initialize approval chain',
        };
    }
}

/**
 * Get required roles for approval level
 * This is a simple implementation - can be made configurable via ApprovalChain
 */
function getRequiredRolesForLevel(level: number): string[] {
    const rolesByLevel: Record<number, string[]> = {
        1: ['content_creator', 'marketer'], // Level 1: Creator/Marketer review
        2: ['brand_manager', 'super_user'], // Level 2: Brand Manager review
        3: ['admin', 'super_user'], // Level 3: Admin final approval
    };
    return rolesByLevel[level] || ['super_user'];
}

// ==================== CAMPAIGN PERFORMANCE TRACKING ====================

/**
 * Get campaign performance metrics with aggregated data
 */
export async function getCampaignPerformance(
    campaignId: string,
    tenantId: string,
    startDate?: string,
    endDate?: string
): Promise<{
    success: boolean;
    data?: {
        performance: any;
        timeSeries: any[];
        topPerformingContent: any[];
    };
    error?: string;
}> {
    try {
        const { firestore } = await createServerClient();

        // Query all content for this campaign
        const contentQuery = firestore
            .collection(`tenants/${tenantId}/${COLLECTION}`)
            .where('campaignId', '==', campaignId);

        const contentSnapshot = await contentQuery.get();

        if (contentSnapshot.empty) {
            return {
                success: true,
                data: {
                    performance: null,
                    timeSeries: [],
                    topPerformingContent: [],
                },
            };
        }

        const allContent = contentSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as CreativeContent[];

        // Calculate aggregated metrics
        const contentByStatus: Record<ContentStatus, number> = {
            draft: 0,
            pending: 0,
            approved: 0,
            revision: 0,
            scheduled: 0,
            published: 0,
            failed: 0,
        };

        const contentByPlatform: Record<SocialPlatform, number> = {
            instagram: 0,
            tiktok: 0,
            linkedin: 0,
            twitter: 0,
            facebook: 0,
        };

        let totalImpressions = 0;
        let totalReach = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalShares = 0;
        let totalSaves = 0;
        let totalQRScans = 0;
        let engagementRateSum = 0;
        let ctrSum = 0;
        let contentWithMetrics = 0;
        let contentWithCTR = 0;

        allContent.forEach((content) => {
            // Count by status
            contentByStatus[content.status]++;

            // Count by platform
            contentByPlatform[content.platform]++;

            // Aggregate engagement metrics
            if (content.engagementMetrics) {
                totalImpressions += content.engagementMetrics.impressions || 0;
                totalReach += content.engagementMetrics.reach || 0;
                totalLikes += content.engagementMetrics.likes || 0;
                totalComments += content.engagementMetrics.comments || 0;
                totalShares += content.engagementMetrics.shares || 0;
                totalSaves += content.engagementMetrics.saves || 0;
                engagementRateSum += content.engagementMetrics.engagementRate || 0;
                contentWithMetrics++;

                if (content.engagementMetrics.clickThroughRate) {
                    ctrSum += content.engagementMetrics.clickThroughRate;
                    contentWithCTR++;
                }
            }

            // Aggregate QR scans
            if (content.qrStats) {
                totalQRScans += content.qrStats.scans || 0;
            }
        });

        const avgEngagementRate = contentWithMetrics > 0 ? engagementRateSum / contentWithMetrics : 0;
        const avgClickThroughRate = contentWithCTR > 0 ? ctrSum / contentWithCTR : undefined;

        // Calculate conversion funnel
        const totalClicks = totalImpressions > 0 && avgClickThroughRate
            ? Math.round((totalImpressions * avgClickThroughRate) / 100)
            : 0;

        const clickRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        const scanRate = totalClicks > 0 ? (totalQRScans / totalClicks) * 100 : 0;

        const performance = {
            campaignId,
            campaignName: allContent[0]?.campaignName || 'Unnamed Campaign',
            totalContent: allContent.length,
            contentByStatus,
            contentByPlatform,
            aggregatedMetrics: {
                totalImpressions,
                totalReach,
                totalLikes,
                totalComments,
                totalShares,
                totalSaves,
                avgEngagementRate,
                avgClickThroughRate,
                totalQRScans,
            },
            conversionFunnel: {
                impressions: totalImpressions,
                clicks: totalClicks,
                qrScans: totalQRScans,
                rates: {
                    clickRate,
                    scanRate,
                },
            },
            startDate: startDate || new Date(0).toISOString(),
            endDate: endDate || new Date().toISOString(),
            lastUpdated: Date.now(),
        };

        // Generate time-series data (daily snapshots)
        const timeSeries = generateCampaignTimeSeries(
            allContent,
            startDate || new Date(0).toISOString(),
            endDate || new Date().toISOString()
        );

        // Get top performing content
        const topPerformingContent = getTopPerformingContentItems(allContent, 5);

        logger.info('[getCampaignPerformance] Performance data retrieved', {
            campaignId,
            totalContent: allContent.length,
        });

        return {
            success: true,
            data: {
                performance,
                timeSeries,
                topPerformingContent,
            },
        };
    } catch (error: unknown) {
        logger.error('[getCampaignPerformance] Error:', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get campaign performance',
        };
    }
}

/**
 * Generate daily time-series snapshots for campaign
 */
function generateCampaignTimeSeries(
    content: CreativeContent[],
    startDate: string,
    endDate: string
): any[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayMap = new Map<string, any>();

    // Initialize days
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        dayMap.set(dateKey, {
            date: dateKey,
            impressions: 0,
            reach: 0,
            engagement: 0,
            qrScans: 0,
            clickThroughRate: 0,
            engagementRate: 0,
            count: 0,
        });
    }

    // Aggregate metrics by day (based on publishedAt)
    content.forEach((item) => {
        if (!item.publishedAt || !item.engagementMetrics) return;

        const publishDate = new Date(item.publishedAt).toISOString().split('T')[0];
        const dayData = dayMap.get(publishDate);

        if (dayData) {
            dayData.impressions += item.engagementMetrics.impressions || 0;
            dayData.reach += item.engagementMetrics.reach || 0;
            dayData.engagement +=
                (item.engagementMetrics.likes || 0) +
                (item.engagementMetrics.comments || 0) +
                (item.engagementMetrics.shares || 0);
            dayData.qrScans += item.qrStats?.scans || 0;
            dayData.clickThroughRate += item.engagementMetrics.clickThroughRate || 0;
            dayData.engagementRate += item.engagementMetrics.engagementRate || 0;
            dayData.count++;
        }
    });

    // Calculate averages
    const timeSeries = Array.from(dayMap.values()).map((day) => ({
        ...day,
        clickThroughRate: day.count > 0 ? day.clickThroughRate / day.count : 0,
        engagementRate: day.count > 0 ? day.engagementRate / day.count : 0,
    }));

    return timeSeries;
}

/**
 * Get top performing content items by performance score
 */
function getTopPerformingContentItems(content: CreativeContent[], limit: number = 5): any[] {
    const scoredContent = content
        .filter((item) => item.engagementMetrics && item.status === 'published')
        .map((item) => {
            const metrics = item.engagementMetrics!;

            // Calculate performance score (0-100)
            // Weighted: engagement rate (50%), reach (30%), CTR (20%)
            const engagementScore = Math.min((metrics.engagementRate / 10) * 50, 50);
            const reachScore = Math.min((metrics.reach / 10000) * 30, 30);
            const ctrScore = metrics.clickThroughRate
                ? Math.min((metrics.clickThroughRate / 5) * 20, 20)
                : 0;

            const performanceScore = Math.round(engagementScore + reachScore + ctrScore);

            return {
                contentId: item.id,
                platform: item.platform,
                captionPreview: item.caption.slice(0, 100),
                thumbnailUrl: item.thumbnailUrl || item.mediaUrls[0],
                metrics: {
                    impressions: metrics.impressions,
                    reach: metrics.reach,
                    likes: metrics.likes,
                    comments: metrics.comments,
                    shares: metrics.shares,
                    engagementRate: metrics.engagementRate,
                },
                publishedAt: item.publishedAt,
                performanceScore,
            };
        })
        .sort((a, b) => b.performanceScore - a.performanceScore)
        .slice(0, limit);

    return scoredContent;
}

/**
 * Compare multiple campaigns side-by-side
 */
export async function compareCampaigns(
    campaignIds: string[],
    tenantId: string,
    startDate?: string,
    endDate?: string
): Promise<{
    success: boolean;
    data?: any;
    error?: string;
}> {
    try {
        const campaigns = [];

        for (const campaignId of campaignIds) {
            const result = await getCampaignPerformance(campaignId, tenantId, startDate, endDate);

            if (result.success && result.data?.performance) {
                const perf = result.data.performance;
                campaigns.push({
                    campaignId: perf.campaignId,
                    campaignName: perf.campaignName,
                    totalContent: perf.totalContent,
                    avgEngagementRate: perf.aggregatedMetrics.avgEngagementRate,
                    totalImpressions: perf.aggregatedMetrics.totalImpressions,
                    totalReach: perf.aggregatedMetrics.totalReach,
                    totalQRScans: perf.aggregatedMetrics.totalQRScans,
                    conversionRate: perf.conversionFunnel.rates.scanRate,
                });
            }
        }

        const comparison = {
            campaigns,
            startDate: startDate || new Date(0).toISOString(),
            endDate: endDate || new Date().toISOString(),
        };

        logger.info('[compareCampaigns] Campaigns compared', {
            campaignCount: campaigns.length,
        });

        return {
            success: true,
            data: comparison,
        };
    } catch (error: unknown) {
        logger.error('[compareCampaigns] Error:', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to compare campaigns',
        };
    }
}
