
import { GenerateVideoInput, GenerateVideoOutput } from '../video-types';

// Veo API job states
type VeoJobStatus = 'PROCESSING' | 'SUCCEEDED' | 'FAILED';

interface VeoJobResponse {
    name: string;
    done?: boolean;
    error?: {
        message: string;
        code?: number;
    };
    response?: {
        generatedVideos?: Array<{
            video?: {
                uri?: string;
            };
        }>;
    };
}

// Constants
const VEO_MODEL = 'veo-3.1-generate-preview';
const VEO_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MAX_POLL_ATTEMPTS = 60; // 5 minutes with 5s intervals
const DEFAULT_POLL_INTERVAL_MS = 5000;

// Configurable options for testing
export interface VeoGeneratorOptions {
    model?: string;
    pollIntervalMs?: number;
    maxPollAttempts?: number;
}

/**
 * Generates a video using Google's Veo model via direct Gemini API.
 * Flow: POST to generateVideos → Poll operation → Return video URL when completed.
 */
export async function generateVeoVideo(
    input: GenerateVideoInput, 
    options?: VeoGeneratorOptions
): Promise<GenerateVideoOutput> {
    console.log('[VeoGenerator] Starting video generation with input:', JSON.stringify(input));

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error('[VeoGenerator] Missing GEMINI_API_KEY or GOOGLE_API_KEY');
    }

    const model = options?.model || VEO_MODEL;
    console.log(`[VeoGenerator] Using model: ${model}`);

    // Step 1: Create the video generation job
    const operationName = await createVideoJob(apiKey, input, model);
    console.log(`[VeoGenerator] Operation created: ${operationName}`);

    const pollOptions = {
        intervalMs: options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
        maxAttempts: options?.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS,
    };
    const result = await pollForCompletion(apiKey, operationName, pollOptions, input.duration || '5');
    console.log(`[VeoGenerator] Job completed. Video URL: ${result.videoUrl}`);

    return result;
}

/**
 * Creates a video generation job and returns the operation name.
 */
async function createVideoJob(
    apiKey: string, 
    input: GenerateVideoInput, 
    model: string
): Promise<string> {
    // Map aspect ratio to proper format
    const aspectRatioMap: Record<string, string> = {
        '16:9': '16:9',
        '9:16': '9:16',
        '1:1': '1:1',
    };
    const aspectRatio = aspectRatioMap[input.aspectRatio || '16:9'] || '16:9';

    // Veo supports 4, 6, or 8 second videos
    const durationMap: Record<string, number> = {
        '5': 4,
        '10': 8,
    };
    const duration = durationMap[input.duration || '5'] || 4;

    const requestBody = {
        instances: [{
            prompt: input.prompt,
        }],
        parameters: {
            aspectRatio: aspectRatio,
            durationSeconds: duration,
            sampleCount: 1,
        }
    };

    const endpoint = `${VEO_API_BASE}/${model}:generateVideos?key=${apiKey}`;
    console.log('[VeoGenerator] Creating job with request:', JSON.stringify(requestBody));

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[VeoGenerator] Job creation failed: ${response.status} - ${errorText}`);
        throw new Error(`Veo API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // The response should contain an operation name for polling
    const operationName = data.name;
    if (!operationName) {
        console.error('[VeoGenerator] No operation name in response:', JSON.stringify(data));
        throw new Error('[VeoGenerator] Invalid response: no operation name returned');
    }

    return operationName;
}

/**
 * Polls the Veo API until the operation completes or times out.
 */
async function pollForCompletion(
    apiKey: string, 
    operationName: string,
    options: { intervalMs: number; maxAttempts: number },
    duration: string
): Promise<GenerateVideoOutput> {
    console.log(`[VeoGenerator] Starting to poll operation ${operationName}...`);

    for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
        await sleep(options.intervalMs);

        // Poll the operation status
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`, {
            method: 'GET',
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[VeoGenerator] Poll request failed: ${response.status} - ${errorText}`);
            throw new Error(`Veo API Poll Error ${response.status}: ${errorText}`);
        }

        const operation: VeoJobResponse = await response.json();
        console.log(`[VeoGenerator] Operation status: done=${operation.done} (attempt ${attempt + 1}/${options.maxAttempts})`);

        if (operation.error) {
            console.error(`[VeoGenerator] Operation failed: ${operation.error.message}`);
            throw new Error(`[VeoGenerator] Video generation failed: ${operation.error.message}`);
        }

        if (operation.done) {
            const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!videoUri) {
                console.error('[VeoGenerator] Operation completed but no video URI in response:', JSON.stringify(operation));
                throw new Error('[VeoGenerator] Operation completed but no video URL in response');
            }
            
            return {
                videoUrl: videoUri,
                thumbnailUrl: undefined,
                duration: parseInt(duration, 10),
            };
        }

        // Not done yet, continue polling
    }

    throw new Error(`[VeoGenerator] Operation ${operationName} timed out after ${options.maxAttempts * options.intervalMs / 1000} seconds`);
}

/**
 * Simple sleep utility.
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
