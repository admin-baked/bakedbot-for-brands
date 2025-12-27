
import { GenerateVideoInput, GenerateVideoOutput } from '../video-types';

// OpenAI Sora API job states - includes all observed statuses
type SoraJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'queued' | 'in_progress';

// OpenAI Sora API response structure - based on actual observed response
interface SoraJobResponse {
    id: string;
    object?: string;
    status: SoraJobStatus;
    created_at?: number;
    completed_at?: number;
    expires_at?: number;
    model?: string;
    progress?: number;
    prompt?: string;
    seconds?: string | number;
    size?: string;
    // Multiple possible locations for video URL
    output?: {
        video_url?: string;
        url?: string;
        video?: string;
    };
    // Direct URL fields
    video_url?: string;
    url?: string;
    video?: string;
    // Download URLs array
    download_urls?: string[];
    downloads?: Array<{ url: string }>;
    // Error info
    error?: {
        message: string;
        code?: string;
    } | null;
}

// Constants
const SORA_API_BASE = 'https://api.openai.com/v1/videos';
const DEFAULT_MAX_POLL_ATTEMPTS = 60; // 5 minutes with 5s intervals
const DEFAULT_POLL_INTERVAL_MS = 5000;

// Configurable options for testing
export interface SoraGeneratorOptions {
    model?: string;
    pollIntervalMs?: number;
    maxPollAttempts?: number;
}

/**
 * Generates a video using OpenAI's Sora model via async job-based API.
 * Flow: POST to create job → Poll for status → Return video URL when completed.
 */
export async function generateSoraVideo(
    input: GenerateVideoInput, 
    options?: SoraGeneratorOptions
): Promise<GenerateVideoOutput> {
    console.log('[SoraGenerator] Starting video generation with input:', JSON.stringify(input));

    const apiKey = process.env.OPENAI_VIDEO_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('[SoraGenerator] Missing OPENAI_VIDEO_API_KEY or OPENAI_API_KEY');
    }

    const model = options?.model || 'sora-2';
    console.log(`[SoraGenerator] Using model: ${model}`);

    // Step 1: Create the video generation job
    const jobId = await createVideoJob(apiKey, input, model);
    console.log(`[SoraGenerator] Job created with ID: ${jobId}`);

    // Step 2: Poll for completion
    const pollOptions = {
        intervalMs: options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
        maxAttempts: options?.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS,
    };
    const result = await pollForCompletion(apiKey, jobId, pollOptions);
    console.log(`[SoraGenerator] Job completed. Video URL: ${result.videoUrl}`);

    return result;
}

/**
 * Creates a video generation job and returns the job ID.
 */
async function createVideoJob(
    apiKey: string, 
    input: GenerateVideoInput, 
    model: string
): Promise<string> {
    // Map aspect ratio to size
    const sizeMap: Record<string, string> = {
        '16:9': '1280x720',
        '9:16': '720x1280',
        '1:1': '720x720',
    };
    const size = sizeMap[input.aspectRatio || '16:9'] || '1280x720';

    // Map duration to seconds (Sora uses '4', '8', '12' string values)
    const secondsMap: Record<string, string> = {
        '5': '4',
        '10': '8',
    };
    const seconds = secondsMap[input.duration || '5'] || '4';

    const requestBody = {
        model,
        prompt: input.prompt,
        size,
        seconds,
    };

    console.log('[SoraGenerator] Creating job with request:', JSON.stringify(requestBody));

    const response = await fetch(SORA_API_BASE, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SoraGenerator] Job creation failed: ${response.status} - ${errorText}`);
        throw new Error(`OpenAI Sora API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // Handle different response shapes
    const jobId = data.id || data.job_id;
    if (!jobId) {
        console.error('[SoraGenerator] No job ID in response:', JSON.stringify(data));
        throw new Error('[SoraGenerator] Invalid response: no job ID returned');
    }

    return jobId;
}

/**
 * Polls the Sora API until the job completes or times out.
 */
async function pollForCompletion(
    apiKey: string, 
    jobId: string,
    options: { intervalMs: number; maxAttempts: number }
): Promise<GenerateVideoOutput> {
    console.log(`[SoraGenerator] Starting to poll job ${jobId}...`);

    for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
        await sleep(options.intervalMs);

        const response = await fetch(`${SORA_API_BASE}/${jobId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[SoraGenerator] Poll request failed: ${response.status} - ${errorText}`);
            throw new Error(`OpenAI Sora API Poll Error ${response.status}: ${errorText}`);
        }

        const job: SoraJobResponse = await response.json();
        console.log(`[SoraGenerator] Job ${jobId} status: ${job.status} (attempt ${attempt + 1}/${options.maxAttempts})`);

        switch (job.status) {
            case 'completed':
                // Log full response for debugging
                console.log(`[SoraGenerator] Full completed response: ${JSON.stringify(job)}`);
                
                // OpenAI Sora requires fetching video from the /content endpoint
                const videoId = job.id;
                const contentUrl = `${SORA_API_BASE}/${videoId}/content`;
                
                console.log(`[SoraGenerator] Downloading video from: ${contentUrl}`);
                
                // Download the video from OpenAI
                const videoResponse = await fetch(contentUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                    },
                });
                
                if (!videoResponse.ok) {
                    const errorText = await videoResponse.text();
                    console.error(`[SoraGenerator] Video download failed: ${videoResponse.status} - ${errorText}`);
                    throw new Error(`[SoraGenerator] Failed to download video: ${videoResponse.status}`);
                }
                
                // Get the video as a blob/buffer
                const videoBuffer = await videoResponse.arrayBuffer();
                console.log(`[SoraGenerator] Downloaded video, size: ${videoBuffer.byteLength} bytes`);
                
                // Upload to Firebase Storage for public access
                const { getStorage } = await import('firebase-admin/storage');
                const storage = getStorage();
                const bucket = storage.bucket();
                const fileName = `generated-videos/${videoId}.mp4`;
                const file = bucket.file(fileName);
                
                await file.save(Buffer.from(videoBuffer), {
                    contentType: 'video/mp4',
                    metadata: {
                        metadata: {
                            generatedBy: 'sora-2',
                            prompt: job.prompt,
                        }
                    }
                });
                
                // Make the file publicly accessible
                await file.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                
                console.log(`[SoraGenerator] Video uploaded to: ${publicUrl}`);
                
                return {
                    videoUrl: publicUrl,
                    thumbnailUrl: undefined,
                    duration: parseInt(job.seconds as string || '5', 10) || 5,
                };

            case 'failed':
                const errorMsg = job.error?.message || 'Unknown error';
                console.error(`[SoraGenerator] Job failed: ${errorMsg}`);
                throw new Error(`[SoraGenerator] Video generation failed: ${errorMsg}`);

            case 'pending':
            case 'running':
            case 'queued':
            case 'in_progress':
                // Continue polling - these are all valid in-progress statuses
                break;

            default:
                console.warn(`[SoraGenerator] Unknown job status: ${job.status}`);
        }
    }

    throw new Error(`[SoraGenerator] Job ${jobId} timed out after ${options.maxAttempts * options.intervalMs / 1000} seconds`);
}

/**
 * Simple sleep utility.
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
