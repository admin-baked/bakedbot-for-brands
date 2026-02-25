/**
 * YouTube Transcript Tools — Shared definitions for any agent that needs video transcription
 *
 * Capabilities:
 *   fetch_youtube_transcript → Extract full transcript from any public YouTube video
 *
 * Usage in an agent:
 *   import { youtubeToolDefs, makeYouTubeToolsImpl } from '@/server/tools/youtube-tools';
 *   const toolsDef = [...agentTools, ...youtubeToolDefs];
 *   const tools = { ...otherTools, ...makeYouTubeToolsImpl(orgId) };
 *
 * Drive auto-save:
 *   When orgId is provided, transcripts are automatically saved to BakedBot Drive
 *   as markdown files under the 'documents' category. This builds an AI-searchable
 *   library of competitor video content over time.
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { getStorage } from 'firebase-admin/storage';
import type { DriveFileDoc } from '@/types/drive';

// =============================================================================
// TYPES
// =============================================================================

export interface YouTubeTranscriptResult {
    videoId: string;
    title: string;
    channel: string;
    thumbnailUrl: string;
    transcript: string;
    segmentCount: number;
    wordCount: number;
    driveFileId?: string;      // set when auto-saved to Drive
    driveFileName?: string;    // set when auto-saved to Drive
}

export interface YouTubeTranscriptError {
    videoId: string;
    error: 'video_not_found' | 'captions_unavailable' | 'fetch_failed' | 'invalid_url';
    message: string;
}

// Internal type for throwing structured errors out of fetch helpers
interface TranscriptFetchError {
    error: YouTubeTranscriptError['error'];
    message: string;
}

// =============================================================================
// HELPERS — exported for testing
// =============================================================================

/**
 * Parse a YouTube video ID from any URL format.
 * Handles: youtu.be, youtube.com/watch, /embed/, /shorts/, m.youtube.com
 */
export function extractVideoId(url: string): string | null {
    const match = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
}

/**
 * Strip HTML entities and tags from caption text.
 */
export function stripHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<[^>]+>/g, '');
}

/**
 * Convert seconds to M:SS timestamp string.
 */
export function secondsToTimestamp(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format transcript + metadata as a Drive-ready markdown document.
 */
export function formatTranscriptMarkdown(params: {
    title: string;
    channel: string;
    videoId: string;
    transcript: string;
    date: string;
    saveNote?: string;
}): string {
    const { title, channel, videoId, transcript, date, saveNote } = params;
    const lines = [
        `# YouTube Transcript: ${title}`,
        `**Channel:** ${channel}`,
        `**Video:** https://www.youtube.com/watch?v=${videoId}`,
        `**Transcribed:** ${date}`,
    ];
    if (saveNote) lines.push(`**Note:** ${saveNote}`);
    lines.push('', '---', '', transcript);
    return lines.join('\n');
}

// =============================================================================
// PRIVATE FETCH HELPERS
// =============================================================================

/**
 * Fetch video metadata via YouTube oEmbed — no API key required.
 * Falls back to placeholder values on failure (non-fatal).
 */
async function fetchYouTubeMetadata(videoId: string): Promise<{
    title: string;
    channel: string;
    thumbnailUrl: string;
}> {
    try {
        const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) {
            return { title: `YouTube Video ${videoId}`, channel: 'Unknown', thumbnailUrl: '' };
        }
        const data = await res.json() as {
            title?: string;
            author_name?: string;
            thumbnail_url?: string;
        };
        return {
            title: data.title || `YouTube Video ${videoId}`,
            channel: data.author_name || 'Unknown',
            thumbnailUrl: data.thumbnail_url || '',
        };
    } catch {
        return { title: `YouTube Video ${videoId}`, channel: 'Unknown', thumbnailUrl: '' };
    }
}

/**
 * Fetch caption XML from YouTube and return clean text.
 *
 * Algorithm:
 * 1. Fetch https://www.youtube.com/watch?v={videoId}
 * 2. Extract ytInitialPlayerResponse JSON
 * 3. Navigate to captions.playerCaptionsTracklistRenderer.captionTracks
 * 4. Prefer English track; fall back to first available
 * 5. Fetch caption XML → parse <text> segments → clean text
 */
async function fetchYouTubeTranscript(
    videoId: string,
    includeTimestamps: boolean
): Promise<{ text: string; segmentCount: number }> {
    // Step 1: Fetch the YouTube page
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
    });

    if (!pageRes.ok) {
        const err: TranscriptFetchError = {
            error: 'video_not_found',
            message: `Video not found or inaccessible (HTTP ${pageRes.status})`,
        };
        throw err;
    }

    const html = await pageRes.text();

    // Step 2: Extract ytInitialPlayerResponse
    const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/);
    if (!match) {
        const err: TranscriptFetchError = {
            error: 'fetch_failed',
            message: 'Could not parse YouTube player response — page structure may have changed',
        };
        throw err;
    }

    let playerResponse: Record<string, unknown>;
    try {
        playerResponse = JSON.parse(match[1]) as Record<string, unknown>;
    } catch {
        const err: TranscriptFetchError = {
            error: 'fetch_failed',
            message: 'YouTube player response JSON could not be parsed',
        };
        throw err;
    }

    // Step 3: Navigate to captionTracks
    const captions = playerResponse?.captions as Record<string, unknown> | undefined;
    const tracklistRenderer = captions?.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined;
    const captionTracks = tracklistRenderer?.captionTracks as Array<Record<string, unknown>> | undefined;

    if (!captionTracks || captionTracks.length === 0) {
        const err: TranscriptFetchError = {
            error: 'captions_unavailable',
            message: 'No captions available for this video. Try enabling auto-generated captions on YouTube first.',
        };
        throw err;
    }

    // Step 4: Prefer English track
    const track =
        captionTracks.find((t) => t.languageCode === 'en') ?? captionTracks[0];
    const captionUrl = track.baseUrl as string;

    // Step 5: Fetch and parse caption XML
    const captionRes = await fetch(captionUrl, { signal: AbortSignal.timeout(10000) });
    if (!captionRes.ok) {
        const err: TranscriptFetchError = {
            error: 'fetch_failed',
            message: 'Could not fetch caption data from YouTube',
        };
        throw err;
    }

    const xml = await captionRes.text();

    // Parse <text start="1.23" dur="2.5">Hello world</text> segments
    const segmentRegex = /<text\s[^>]*start="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
    const segments: Array<{ start: number; text: string }> = [];
    let segMatch: RegExpExecArray | null;

    while ((segMatch = segmentRegex.exec(xml)) !== null) {
        const start = parseFloat(segMatch[1]);
        const rawText = stripHtmlEntities(segMatch[2]).trim();
        if (rawText) {
            segments.push({ start, text: rawText });
        }
    }

    if (segments.length === 0) {
        const err: TranscriptFetchError = {
            error: 'captions_unavailable',
            message: 'Caption file is empty or could not be parsed',
        };
        throw err;
    }

    // Format output
    let text: string;
    if (includeTimestamps) {
        text = segments.map((s) => `[${secondsToTimestamp(s.start)}] ${s.text}`).join('\n');
    } else {
        // Group into readable paragraphs every 15 segments
        const paragraphs: string[] = [];
        for (let i = 0; i < segments.length; i += 15) {
            const chunk = segments
                .slice(i, i + 15)
                .map((s) => s.text)
                .join(' ');
            paragraphs.push(chunk);
        }
        text = paragraphs.join('\n\n');
    }

    return { text, segmentCount: segments.length };
}

// =============================================================================
// DRIVE SAVE
// =============================================================================

/**
 * Upload transcript to Firebase Storage and write a drive_files Firestore doc.
 * Returns the Firestore document ID.
 */
async function saveTranscriptToDrive(
    orgId: string,
    fileName: string,
    content: string,
    videoId: string,
    title: string,
    channel: string
): Promise<string> {
    const buffer = Buffer.from(content, 'utf-8');

    // Upload to Firebase Storage
    const storage = getStorage();
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'bakedbot-global-assets';
    const bucket = storage.bucket(bucketName);
    const safeFileName = fileName.replace(/[^a-z0-9._\- ]/gi, '_');
    const storagePath = `drive/${orgId}/documents/${Date.now()}_${safeFileName}`;
    const fileRef = bucket.file(storagePath);

    await fileRef.save(buffer, {
        contentType: 'text/plain',
        metadata: {
            metadata: {
                orgId,
                source: 'youtube_transcript',
                videoId,
                channel,
            },
        },
    });

    const [downloadUrl] = await fileRef.getSignedUrl({
        action: 'read',
        expires: '03-01-2500', // Far future — same as DriveStorageService pattern
    });

    // Write Firestore drive_files doc so it appears in BakedBot Drive UI
    const db = getAdminFirestore();
    const now = Date.now();
    const fileDoc: DriveFileDoc = {
        id: '',
        name: fileName,
        mimeType: 'text/plain',
        size: buffer.length,
        storagePath,
        downloadUrl,
        folderId: null,
        path: `/${fileName}`,
        ownerId: orgId,
        ownerEmail: 'system@bakedbot.ai',
        category: 'documents',
        tags: ['youtube', 'transcript', 'competitive-research'],
        description: `YouTube transcript: "${title}" by ${channel}`,
        metadata: {
            source: 'youtube_transcript',
            videoId,
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            channel,
        },
        isShared: false,
        shareIds: [],
        viewCount: 0,
        downloadCount: 0,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
    };

    const driveRef = await db.collection('drive_files').add(fileDoc);
    await driveRef.update({ id: driveRef.id });

    return driveRef.id;
}

// =============================================================================
// TOOL DEFINITIONS (Zod schemas for agent harness)
// =============================================================================

export const youtubeToolDefs = [
    {
        name: 'fetch_youtube_transcript',
        description:
            'Fetches the full transcript from any public YouTube video. Use this whenever the user shares a YouTube URL, or when researching competitor videos, ads, interviews, or announcements. Returns the complete transcript text plus video metadata (title, channel). Automatically saves to BakedBot Drive for future reference.',
        schema: z.object({
            url: z.string().describe(
                'YouTube video URL in any format — youtu.be short links, youtube.com/watch, /embed/, /shorts/'
            ),
            includeTimestamps: z
                .boolean()
                .optional()
                .describe('Include [M:SS] timestamps before each segment (default: false)'),
            saveNote: z
                .string()
                .optional()
                .describe('Optional research note appended to the Drive file for future context'),
        }),
    },
] as const;

// =============================================================================
// IMPLEMENTATIONS (spread into agent tool executor)
// =============================================================================

/**
 * Factory — returns tool implementations with Drive auto-save baked in.
 *
 * @param orgId — when provided, transcripts auto-save to Drive under this org.
 *                Pass undefined for agents without org context.
 */
export function makeYouTubeToolsImpl(orgId?: string) {
    return {
        fetch_youtube_transcript: async ({
            url,
            includeTimestamps = false,
            saveNote,
        }: {
            url: string;
            includeTimestamps?: boolean;
            saveNote?: string;
        }): Promise<YouTubeTranscriptResult | YouTubeTranscriptError> => {
            // 1. Extract video ID
            const videoId = extractVideoId(url);
            if (!videoId) {
                return {
                    videoId: '',
                    error: 'invalid_url',
                    message: `Could not extract a YouTube video ID from: ${url}`,
                };
            }

            try {
                // 2. Fetch metadata and transcript in parallel
                const [metadata, transcriptData] = await Promise.all([
                    fetchYouTubeMetadata(videoId),
                    fetchYouTubeTranscript(videoId, includeTimestamps),
                ]);

                const wordCount = transcriptData.text.split(/\s+/).filter(Boolean).length;

                const result: YouTubeTranscriptResult = {
                    videoId,
                    title: metadata.title,
                    channel: metadata.channel,
                    thumbnailUrl: metadata.thumbnailUrl,
                    transcript: transcriptData.text,
                    segmentCount: transcriptData.segmentCount,
                    wordCount,
                };

                // 3. Auto-save to Drive (non-fatal — transcript returned regardless)
                if (orgId) {
                    try {
                        const date = new Date().toISOString().split('T')[0];
                        const safeName = metadata.title
                            .replace(/[^a-z0-9 ]/gi, '')
                            .trim()
                            .substring(0, 60);
                        const fileName = `YouTube Transcript - ${safeName} - ${date}.md`;
                        const content = formatTranscriptMarkdown({
                            title: metadata.title,
                            channel: metadata.channel,
                            videoId,
                            transcript: transcriptData.text,
                            date,
                            saveNote,
                        });

                        const fileId = await saveTranscriptToDrive(
                            orgId,
                            fileName,
                            content,
                            videoId,
                            metadata.title,
                            metadata.channel
                        );

                        result.driveFileId = fileId;
                        result.driveFileName = fileName;
                        logger.info('[YouTubeTools] Transcript saved to Drive', {
                            orgId,
                            fileId,
                            videoId,
                            title: metadata.title,
                        });
                    } catch (driveErr) {
                        // Non-fatal — transcript still returned even if Drive save fails
                        logger.warn('[YouTubeTools] Drive save failed (non-fatal)', {
                            orgId,
                            videoId,
                            error: String(driveErr),
                        });
                    }
                }

                return result;
            } catch (err: unknown) {
                // Handle structured errors from fetch helpers
                if (err && typeof err === 'object' && 'error' in err) {
                    const e = err as TranscriptFetchError;
                    return {
                        videoId,
                        error: e.error,
                        message: e.message,
                    };
                }
                logger.error('[YouTubeTools] Unexpected error', {
                    videoId,
                    error: String(err),
                });
                return {
                    videoId,
                    error: 'fetch_failed',
                    message: `Unexpected error while fetching transcript: ${String(err)}`,
                };
            }
        },
    };
}
