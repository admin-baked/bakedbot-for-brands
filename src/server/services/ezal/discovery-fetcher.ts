'use server';

// src/server/services/ezal/discovery-fetcher.ts
/**
 * Discovery Fetcher
 * Fetches URLs while respecting robots.txt and rate limits
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { DiscoveryRun, DataSource, DiscoveryJob } from '@/types/ezal-discovery';
import { updateJobStatus, getDiscoveryJob } from './discovery-scheduler';
import { getDataSource, markSourceDiscovered } from './competitor-manager';
import * as crypto from 'crypto';

const COLLECTION_DISCOVERY_RUNS = 'discovery_runs';

// User agent string for polite discovery
const USER_AGENT = 'BakedBot-Ezal/1.0 (Competitive Intelligence; +https://bakedbot.ai)';

// Default timeout in milliseconds
const DEFAULT_TIMEOUT_MS = 15000;

// =============================================================================
// ROBOTS.TXT HANDLING
// =============================================================================

// Simple in-memory cache for robots.txt rules
const robotsCache = new Map<string, { allowed: boolean; expires: number }>();

/**
 * Check if we're allowed to fetch a URL based on robots.txt
 */
export async function checkRobotsTxt(url: string): Promise<boolean> {
    try {
        const urlObj = new URL(url);
        const robotsUrl = `${urlObj.origin}/robots.txt`;

        // Check cache first
        const cached = robotsCache.get(urlObj.origin);
        if (cached && cached.expires > Date.now()) {
            return cached.allowed;
        }

        // Fetch robots.txt
        const response = await fetch(robotsUrl, {
            headers: { 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            // If no robots.txt, assume allowed
            robotsCache.set(urlObj.origin, { allowed: true, expires: Date.now() + 3600000 });
            return true;
        }

        const robotsText = await response.text();
        const isAllowed = !isDisallowed(robotsText, urlObj.pathname);

        // Cache for 1 hour
        robotsCache.set(urlObj.origin, {
            allowed: isAllowed,
            expires: Date.now() + 3600000
        });

        return isAllowed;

    } catch (error) {
        logger.warn('[Ezal] Robots.txt check failed, assuming allowed:', {
            url,
            error: error instanceof Error ? error.message : String(error),
        });
        return true;
    }
}

/**
 * Simple robots.txt parser
 */
function isDisallowed(robotsText: string, path: string): boolean {
    const lines = robotsText.split('\n');
    let inBotSection = false;
    let disallowedPaths: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim().toLowerCase();

        if (trimmed.startsWith('user-agent:')) {
            const agent = trimmed.replace('user-agent:', '').trim();
            inBotSection = agent === '*' || agent.includes('bakedbot') || agent.includes('ezal');
        } else if (inBotSection && trimmed.startsWith('disallow:')) {
            const disallowPath = trimmed.replace('disallow:', '').trim();
            if (disallowPath) {
                disallowedPaths.push(disallowPath);
            }
        }
    }

    // Check if our path matches any disallowed patterns
    return disallowedPaths.some(disallowed => {
        if (disallowed === '/') return true; // All disallowed
        return path.startsWith(disallowed);
    });
}

// =============================================================================
// FETCHING
// =============================================================================

/**
 * Fetch a URL and return the content
 */
export async function fetchUrl(
    url: string,
    options?: {
        headers?: Record<string, string>;
        timeout?: number;
        checkRobots?: boolean;
    }
): Promise<{
    success: boolean;
    content?: string;
    contentType?: string;
    httpStatus?: number;
    error?: string;
}> {
    const startTime = Date.now();

    try {
        // Check robots.txt if requested
        if (options?.checkRobots !== false) {
            const allowed = await checkRobotsTxt(url);
            if (!allowed) {
                return {
                    success: false,
                    error: 'Blocked by robots.txt',
                };
            }
        }

        // Fetch the URL
        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/json,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
                ...options?.headers,
            },
            signal: AbortSignal.timeout(options?.timeout || DEFAULT_TIMEOUT_MS),
        });

        const contentType = response.headers.get('content-type') || 'text/html';
        const content = await response.text();

        logger.info('[Ezal] Fetch completed:', {
            url,
            status: response.status,
            contentLength: content.length,
            duration: Date.now() - startTime,
        });

        return {
            success: response.ok,
            content,
            contentType,
            httpStatus: response.status,
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[Ezal] Fetch failed:', {
            url,
            error: errorMessage,
            duration: Date.now() - startTime,
        });

        return {
            success: false,
            error: errorMessage,
        };
    }
}

// =============================================================================
// DISCOVERY RUN MANAGEMENT
// =============================================================================

/**
 * Create a discovery run record
 */
async function createDiscoveryRun(
    tenantId: string,
    sourceId: string,
    competitorId: string,
    jobId: string
): Promise<string> {
    const { firestore } = await createServerClient();

    const runData = {
        tenantId,
        sourceId,
        competitorId,
        jobId,
        startedAt: new Date(),
        finishedAt: null,
        status: 'running',
        httpStatus: null,
        snapshotPath: '',
        contentType: '',
        contentHash: '',
        numProductsParsed: 0,
        numProductsChanged: 0,
        numProductsNew: 0,
        durationMs: 0,
        errorMessage: null,
    };

    const docRef = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_DISCOVERY_RUNS)
        .add(runData);

    return docRef.id;
}

/**
 * Update discovery run with results
 */
async function updateDiscoveryRun(
    tenantId: string,
    runId: string,
    updates: Partial<DiscoveryRun>
): Promise<void> {
    const { firestore } = await createServerClient();

    await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_DISCOVERY_RUNS)
        .doc(runId)
        .update(updates);
}

/**
 * Generate content hash for deduplication
 */
function hashContent(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
}

// =============================================================================
// MAIN DISCOVERY EXECUTION
// =============================================================================

export interface DiscoveryResult {
    success: boolean;
    runId: string;
    content?: string;
    contentHash?: string;
    httpStatus?: number;
    error?: string;
}

/**
 * Execute a discovery job - fetch, store, and prepare for parsing
 */
export async function executeDiscovery(
    tenantId: string,
    jobId: string
): Promise<DiscoveryResult> {
    const startTime = Date.now();

    // Get the job
    const job = await getDiscoveryJob(tenantId, jobId);
    if (!job) {
        throw new Error(`Job not found: ${jobId}`);
    }

    // Get the data source
    const source = await getDataSource(tenantId, job.sourceId);
    if (!source) {
        throw new Error(`Data source not found: ${job.sourceId}`);
    }

    // Mark job as running
    await updateJobStatus(tenantId, jobId, 'running');

    // Create discovery run record
    const runId = await createDiscoveryRun(
        tenantId,
        source.id,
        job.competitorId,
        jobId
    );

    // Update job with run ID
    await updateJobStatus(tenantId, jobId, 'running', { runId });

    try {
        // Check robots.txt
        if (!source.robotsAllowed) {
            const allowed = await checkRobotsTxt(source.baseUrl);
            if (!allowed) {
                throw new Error('URL is disallowed by robots.txt');
            }
        }

        // Fetch the URL
        const fetchResult = await fetchUrl(source.baseUrl, {
            checkRobots: false, // Already checked
        });

        if (!fetchResult.success) {
            throw new Error(fetchResult.error || 'Fetch failed');
        }

        const content = fetchResult.content!;
        const contentHash = hashContent(content);

        // Update run with fetch results
        const durationMs = Date.now() - startTime;
        await updateDiscoveryRun(tenantId, runId, {
            finishedAt: new Date(),
            status: 'success',
            httpStatus: fetchResult.httpStatus,
            contentType: fetchResult.contentType || 'text/html',
            contentHash,
            durationMs,
            // snapshotPath would be set after storing to Cloud Storage
            snapshotPath: `tenants/${tenantId}/snapshots/${source.competitorId}/${Date.now()}.html`,
        });

        // Mark job as done
        await updateJobStatus(tenantId, jobId, 'done');

        // Update source last discovery time
        await markSourceDiscovered(tenantId, source.id, source.frequencyMinutes);

        logger.info('[Ezal] Discovery completed:', {
            tenantId,
            jobId,
            runId,
            durationMs,
            contentLength: content.length,
        });

        return {
            success: true,
            runId,
            content,
            contentHash,
            httpStatus: fetchResult.httpStatus,
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Update run with error
        await updateDiscoveryRun(tenantId, runId, {
            finishedAt: new Date(),
            status: 'error',
            errorMessage,
            durationMs: Date.now() - startTime,
        });

        // Mark job as failed
        await updateJobStatus(tenantId, jobId, 'error', {
            runId,
            errorMessage
        });

        logger.error('[Ezal] Discovery failed:', {
            tenantId,
            jobId,
            runId,
            error: errorMessage,
        });

        return {
            success: false,
            runId,
            error: errorMessage,
        };
    }
}

/**
 * Execute a manual/immediate discovery for a source (skips scheduler)
 */
export async function discoverNow(
    tenantId: string,
    sourceId: string
): Promise<DiscoveryResult> {
    const source = await getDataSource(tenantId, sourceId);
    if (!source) {
        throw new Error(`Data source not found: ${sourceId}`);
    }

    // Create an immediate job
    const { firestore } = await createServerClient();
    const jobData = {
        tenantId,
        sourceId,
        competitorId: source.competitorId,
        scheduledFor: new Date(),
        status: 'queued',
        runId: null,
        createdBy: 'manual',
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        errorMessage: null,
    };

    const jobRef = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('discovery_jobs')
        .add(jobData);

    // Execute immediately
    return executeDiscovery(tenantId, jobRef.id);
}

/**
 * Get recent discovery runs for a source
 */
export async function getRecentRuns(
    tenantId: string,
    sourceId: string,
    limit: number = 10
): Promise<DiscoveryRun[]> {
    const { firestore } = await createServerClient();

    const snapshot = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_DISCOVERY_RUNS)
        .where('sourceId', '==', sourceId)
        .orderBy('startedAt', 'desc')
        .limit(limit)
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            startedAt: data.startedAt?.toDate?.() || new Date(),
            finishedAt: data.finishedAt?.toDate?.() || null,
        } as DiscoveryRun;
    });
}
