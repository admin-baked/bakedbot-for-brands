'use server';

/**
 * fal.ai Video Generator — Kling v2 Master + Wan 2.1
 *
 * fal.ai queue pattern:
 *   POST /queue/{model} → request_id
 *   GET  /queue/{model}/requests/{id}/status → polling
 *   GET  /queue/{model}/requests/{id}        → result when COMPLETED
 *
 * Pricing vs Veo 3.1:
 *   Veo 3.1:  ~$0.35/sec  (~$1.40–2.80 per 4-8s clip)
 *   Kling v2: ~$0.045/sec (~$0.18–0.36 per 4-8s clip) — 8x cheaper
 *   Wan 2.1:  ~$0.01/sec  (~$0.04–0.08 per 4-8s clip) — 35x cheaper (model: fal-ai/wan-t2v)
 */

import { logger } from '@/lib/logger';
import { trackMediaGeneration, calculateVideoCost, saveMediaToDrive } from '@/server/services/media-tracking';
import { checkAIStudioActionAllowed, chargeAIStudioCredits } from '@/server/services/ai-studio-billing-service';
import type { GenerateVideoInput, GenerateVideoOutput } from '../video-types';

const FAL_QUEUE_BASE = 'https://queue.fal.run';

const FAL_VIDEO_MODELS = {
    kling: 'fal-ai/kling-video/v2/master/text-to-video',
    wan: 'fal-ai/wan-t2v',
} as const;

type FalVideoModel = keyof typeof FAL_VIDEO_MODELS;

interface FalQueueSubmitResponse {
    request_id: string;
    status: string;
    response_url: string;
    status_url: string;
    cancel_url: string;
    logs?: unknown[];
}

interface FalQueueStatusResponse {
    status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    logs?: Array<{ message: string }>;
    error?: string;
}

interface FalVideoResult {
    video?: {
        url: string;
        content_type?: string;
        file_name?: string;
        file_size?: number;
    };
    // Some models return videos array
    videos?: Array<{ url: string }>;
    error?: string;
}

const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_MAX_POLL_ATTEMPTS = 72; // 6 minutes

export interface FalVideoOptions {
    pollIntervalMs?: number;
    maxPollAttempts?: number;
}

/**
 * Generate a video using fal.ai Kling v2 Master.
 * Cinema-grade motion quality, ~$0.045/sec — best quality/cost ratio.
 */
export async function generateKlingVideo(
    input: GenerateVideoInput,
    options?: FalVideoOptions
): Promise<GenerateVideoOutput> {
    return generateFalVideo('kling', input, options);
}

/**
 * Generate a video using fal.ai Wan 2.1 (1.3B).
 * Fast and very cheap, ~$0.01/sec — ideal for drafts and high-volume.
 */
export async function generateWanVideo(
    input: GenerateVideoInput,
    options?: FalVideoOptions
): Promise<GenerateVideoOutput> {
    return generateFalVideo('wan', input, options);
}

async function generateFalVideo(
    model: FalVideoModel,
    input: GenerateVideoInput,
    options?: FalVideoOptions
): Promise<GenerateVideoOutput> {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) {
        throw new Error('[FalVideo] FAL_API_KEY not configured');
    }

    const modelPath = FAL_VIDEO_MODELS[model];
    const durationSeconds = parseInt(input.duration || '5', 10);
    const actionType = durationSeconds <= 5 ? 'video_short' as const : 'video_full' as const;
    const orgId = input.orgId || 'unknown';

    // Credit gate: check if org has enough credits before generating
    if (orgId !== 'unknown') {
        const creditCheck = await checkAIStudioActionAllowed({
            orgId,
            userId: input.userId,
            actionType,
            automationTriggered: false,
            sourceSurface: 'media',
        });
        if (!creditCheck.allowed) {
            throw new Error(`[FalVideo] Insufficient credits: ${creditCheck.reason || creditCheck.errorCode}`);
        }
    }

    logger.info('[FalVideo] Starting video generation', { model, modelPath, prompt: input.prompt.substring(0, 80) });

    // Step 1: Submit to queue
    const queued = await submitToQueue(apiKey, modelPath, input, model);
    logger.info('[FalVideo] Submitted to queue', { model, requestId: queued.request_id });

    // Step 2: Poll for completion.
    // status_url from fal response avoids 405 on Wan's nested model path.
    // Result URL derived from status_url by stripping /status — same correct base, avoids 404.
    const resultUrl = queued.status_url.replace(/\/status$/, '');
    const pollOpts = {
        intervalMs: options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
        maxAttempts: options?.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS,
    };
    const videoUrl = await pollUntilComplete(apiKey, queued.status_url, resultUrl, pollOpts);
    logger.info('[FalVideo] Video ready', { model, videoUrl });

    // Track cost (USD ledger) + charge credits + save to Drive (all non-blocking)
    const provider = model as 'kling' | 'wan';
    const costUsd = calculateVideoCost(provider, durationSeconds);
    trackMediaGeneration({
        tenantId: orgId,
        userId: input.userId || 'system',
        type: 'video',
        provider,
        model: modelPath,
        prompt: input.prompt,
        durationSeconds,
        aspectRatio: input.aspectRatio,
        costUsd,
        success: true,
    }).catch(err => logger.warn('[FalVideo] Tracking failed (non-fatal)', { error: String(err) }));

    // Deduct AI Studio credits (non-blocking — never block on billing failure)
    if (orgId !== 'unknown') {
        chargeAIStudioCredits({
            orgId,
            userId: input.userId,
            actionType,
            sourceSurface: 'media',
            automationTriggered: false,
            success: true,
            modelOrProvider: `fal-${model}`,
        }).catch(err => logger.warn('[FalVideo] Credit charge failed (non-fatal)', { error: String(err) }));
    }

    saveMediaToDrive({
        mediaUrl: videoUrl,
        tenantId: orgId,
        type: 'video',
        provider: model,
        prompt: input.prompt,
    }).catch(err => logger.warn('[FalVideo] Drive save failed (non-fatal)', { error: String(err) }));

    return {
        videoUrl,
        thumbnailUrl: undefined,
        duration: durationSeconds,
        provider: model,
        model: modelPath,
    };
}

async function submitToQueue(
    apiKey: string,
    modelPath: string,
    input: GenerateVideoInput,
    model: FalVideoModel
): Promise<FalQueueSubmitResponse> {
    const ASPECT_RATIO_MAP: Record<string, string> = { '16:9': '16:9', '9:16': '9:16', '1:1': '1:1' };
    const rawRatio = ASPECT_RATIO_MAP[input.aspectRatio || '16:9'] || '16:9';
    // Wan 2.1 only accepts '9:16' or '16:9' — remap 1:1 to 16:9
    const aspectRatio = model === 'wan' && rawRatio === '1:1' ? '16:9' : rawRatio;

    // fal.ai duration: '5' or '10' seconds (both models support these)
    const duration = input.duration === '10' ? '10' : '5';

    const body = {
        prompt: input.prompt,
        duration,
        aspect_ratio: aspectRatio,
    };

    const res = await fetch(`${FAL_QUEUE_BASE}/${modelPath}`, {
        method: 'POST',
        headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => 'unknown');
        throw new Error(`[FalVideo] Queue submit failed (${res.status}): ${errText.substring(0, 200)}`);
    }

    const data = await res.json() as FalQueueSubmitResponse;
    if (!data.request_id) {
        throw new Error(`[FalVideo] No request_id in queue response: ${JSON.stringify(data)}`);
    }

    return data;
}

async function pollUntilComplete(
    apiKey: string,
    statusUrl: string,
    resultUrl: string,
    options: { intervalMs: number; maxAttempts: number }
): Promise<string> {
    for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
        if (attempt > 0) await sleep(options.intervalMs);

        // Check status
        const statusRes = await fetch(statusUrl, {
            headers: { 'Authorization': `Key ${apiKey}` },
        });

        if (!statusRes.ok) {
            const errText = await statusRes.text().catch(() => 'unknown');
            throw new Error(`[FalVideo] Status poll failed (${statusRes.status}): ${errText.substring(0, 200)}`);
        }

        const status = await statusRes.json() as FalQueueStatusResponse;
        logger.info('[FalVideo] Poll status', { status: status.status, attempt: attempt + 1 });

        if (status.status === 'FAILED') {
            throw new Error(`[FalVideo] Generation failed: ${status.error || 'unknown error'}`);
        }

        if (status.status === 'COMPLETED') {
            // Fetch the result
            const resultRes = await fetch(resultUrl, {
                headers: { 'Authorization': `Key ${apiKey}` },
            });

            if (!resultRes.ok) {
                const errText = await resultRes.text().catch(() => 'unknown');
                throw new Error(`[FalVideo] Result fetch failed (${resultRes.status}): ${errText.substring(0, 200)}`);
            }

            const result = await resultRes.json() as FalVideoResult;

            // Extract URL — different models use different response shapes
            const videoUrl = result.video?.url || result.videos?.[0]?.url;
            if (!videoUrl) {
                throw new Error(`[FalVideo] No video URL in result: ${JSON.stringify(result).substring(0, 300)}`);
            }

            return videoUrl;
        }

        // IN_QUEUE or IN_PROGRESS — keep polling
    }

    throw new Error(`[FalVideo] Timed out after ${options.maxAttempts * options.intervalMs / 1000}s`);
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

