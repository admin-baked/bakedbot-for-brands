/**
 * Tests for YouTube Transcript Tools
 *
 * All HTTP calls are mocked — no real network requests.
 * Tests cover: URL parsing, HTML entity stripping, timestamp formatting,
 * markdown formatting, tool factory behavior (with/without orgId),
 * error handling (invalid URL, no captions, fetch failures).
 *
 * IMPORTANT: fetchYouTubeMetadata (oembed) and fetchYouTubeTranscript (page)
 * run concurrently via Promise.all, so mock order is non-deterministic.
 * All integration tests use mockImplementation routed by URL instead of
 * mockResolvedValueOnce chaining to avoid flaky ordering bugs.
 */

import {
    extractVideoId,
    stripHtmlEntities,
    secondsToTimestamp,
    formatTranscriptMarkdown,
    makeYouTubeToolsImpl,
} from '@/server/tools/youtube-tools';

// =============================================================================
// MOCKS
// =============================================================================

// Mock Firebase Admin so Drive save doesn't hit real infrastructure
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => ({
        collection: jest.fn(() => ({
            add: jest.fn().mockResolvedValue({
                id: 'mock-drive-file-id',
                update: jest.fn().mockResolvedValue(undefined),
            }),
        })),
    })),
}));

jest.mock('firebase-admin/storage', () => ({
    getStorage: jest.fn(() => ({
        bucket: jest.fn(() => ({
            file: jest.fn(() => ({
                save: jest.fn().mockResolvedValue(undefined),
                getSignedUrl: jest.fn().mockResolvedValue(['https://mock-signed-url.com/file.md']),
            })),
        })),
    })),
}));

// =============================================================================
// HELPERS
// =============================================================================

function buildMockPageHtml(captionTracks: object[]): string {
    const playerResponse = {
        captions: {
            playerCaptionsTracklistRenderer: {
                captionTracks,
            },
        },
    };
    return `<html><body>var ytInitialPlayerResponse = ${JSON.stringify(playerResponse)};</body></html>`;
}

function buildMockCaptionXml(segments: Array<{ start: number; text: string }>): string {
    const lines = segments.map(
        (s) => `<text start="${s.start}" dur="1.0">${s.text}</text>`
    );
    return `<?xml version="1.0" encoding="utf-8" ?><transcript>${lines.join('')}</transcript>`;
}

/**
 * Build a URL-routing fetch mock.
 * Routes by URL substring so parallel Promise.all calls always get the right response:
 *   - 'oembed'    → oembed JSON (video metadata)
 *   - '/watch'    → YouTube page HTML (ytInitialPlayerResponse)
 *   - everything else → caption XML (timedtext URL)
 */
function buildFetchMock(opts: {
    pageHtml: string;
    oembedData: object;
    captionXml?: string;
}) {
    return jest.fn((url: string) => {
        if ((url as string).includes('oembed')) {
            return Promise.resolve({ ok: true, json: async () => opts.oembedData });
        }
        if ((url as string).includes('/watch')) {
            return Promise.resolve({ ok: true, text: async () => opts.pageHtml });
        }
        // Caption XML (timedtext URL or any baseUrl set in captionTracks)
        return Promise.resolve({ ok: true, text: async () => opts.captionXml ?? '' });
    });
}

// =============================================================================
// 1. extractVideoId
// =============================================================================

describe('extractVideoId', () => {
    it('TC-1: parses youtu.be short link with si param', () => {
        expect(extractVideoId('https://youtu.be/QWzLPn164w0?si=rA7ScTtmbyQH-CgK')).toBe('QWzLPn164w0');
    });

    it('TC-2: parses youtube.com/watch?v= format', () => {
        expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('TC-3: parses /embed/ format', () => {
        expect(extractVideoId('https://youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('TC-4: parses /shorts/ format', () => {
        expect(extractVideoId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('TC-5: parses m.youtube.com with timestamp', () => {
        expect(extractVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toBe('dQw4w9WgXcQ');
    });

    it('TC-6: returns null for non-YouTube URL', () => {
        expect(extractVideoId('not a youtube url')).toBeNull();
    });

    it('TC-7: returns null for Vimeo URL', () => {
        expect(extractVideoId('https://vimeo.com/123456')).toBeNull();
    });
});

// =============================================================================
// 2. stripHtmlEntities
// =============================================================================

describe('stripHtmlEntities', () => {
    it('TC-8: strips &amp;', () => {
        expect(stripHtmlEntities('rock &amp; roll')).toBe('rock & roll');
    });

    it('TC-9: strips &#39; to apostrophe', () => {
        expect(stripHtmlEntities('it&#39;s great')).toBe("it's great");
    });

    it('TC-10: strips &quot;', () => {
        expect(stripHtmlEntities('say &quot;hello&quot;')).toBe('say "hello"');
    });

    it('TC-11: strips <font> tags', () => {
        expect(stripHtmlEntities('<font color="red">text</font>')).toBe('text');
    });

    it('TC-12: handles multiple entities in one string', () => {
        expect(stripHtmlEntities('it&#39;s &amp; it&quot;s')).toBe("it's & it\"s");
    });
});

// =============================================================================
// 3. secondsToTimestamp
// =============================================================================

describe('secondsToTimestamp', () => {
    it('TC-15: converts 0 seconds to 0:00', () => {
        expect(secondsToTimestamp(0)).toBe('0:00');
    });

    it('TC-15b: converts 65.3 seconds to 1:05', () => {
        expect(secondsToTimestamp(65.3)).toBe('1:05');
    });

    it('TC-15c: converts 3661 seconds to 61:01', () => {
        expect(secondsToTimestamp(3661)).toBe('61:01');
    });

    it('TC-15d: pads single-digit seconds with leading zero', () => {
        expect(secondsToTimestamp(62)).toBe('1:02');
    });
});

// =============================================================================
// 4. formatTranscriptMarkdown
// =============================================================================

describe('formatTranscriptMarkdown', () => {
    const base = {
        title: 'Test Video',
        channel: 'Test Channel',
        videoId: 'abc123',
        transcript: 'Hello world.',
        date: '2026-02-24',
    };

    it('TC-7: contains markdown heading with title', () => {
        const result = formatTranscriptMarkdown(base);
        expect(result).toContain('# YouTube Transcript: Test Video');
    });

    it('TC-7b: contains channel line', () => {
        const result = formatTranscriptMarkdown(base);
        expect(result).toContain('**Channel:** Test Channel');
    });

    it('TC-7c: contains video URL', () => {
        const result = formatTranscriptMarkdown(base);
        expect(result).toContain('https://www.youtube.com/watch?v=abc123');
    });

    it('TC-7d: contains separator and transcript', () => {
        const result = formatTranscriptMarkdown(base);
        expect(result).toContain('---');
        expect(result).toContain('Hello world.');
    });

    it('TC-7e: includes saveNote when provided', () => {
        const result = formatTranscriptMarkdown({ ...base, saveNote: 'Competitor research' });
        expect(result).toContain('**Note:** Competitor research');
    });

    it('TC-7f: omits Note line when saveNote is undefined', () => {
        const result = formatTranscriptMarkdown(base);
        expect(result).not.toContain('**Note:**');
    });
});

// =============================================================================
// 5. makeYouTubeToolsImpl — without orgId (no Drive save)
// =============================================================================

describe('makeYouTubeToolsImpl — no orgId', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('TC-11: returns invalid_url error for non-YouTube URL', async () => {
        // No fetch needed — extractVideoId fails before any network call
        const tools = makeYouTubeToolsImpl(undefined);
        const result = await tools.fetch_youtube_transcript({ url: 'not a youtube url' });
        expect(result).toMatchObject({ error: 'invalid_url' });
    });

    it('TC-9: returns driveFileId undefined when no orgId', async () => {
        const captionXml = buildMockCaptionXml([
            { start: 0, text: 'Hello' },
            { start: 1, text: 'world' },
        ]);
        const pageHtml = buildMockPageHtml([
            { languageCode: 'en', baseUrl: 'https://youtube.com/api/timedtext?v=test' },
        ]);
        const oembedData = { title: 'Test Video', author_name: 'Test Channel', thumbnail_url: 'https://img.jpg' };

        global.fetch = buildFetchMock({ pageHtml, oembedData, captionXml });

        const tools = makeYouTubeToolsImpl(undefined);
        const result = await tools.fetch_youtube_transcript({
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        });

        expect('error' in result).toBe(false);
        if (!('error' in result)) {
            expect(result.driveFileId).toBeUndefined();
        }
    });

    it('TC-12: returns captions_unavailable when captionTracks is empty', async () => {
        const pageHtml = buildMockPageHtml([]); // empty tracks → no captions
        const oembedData = { title: 'T', author_name: 'C', thumbnail_url: '' };

        global.fetch = buildFetchMock({ pageHtml, oembedData });

        const tools = makeYouTubeToolsImpl(undefined);
        const result = await tools.fetch_youtube_transcript({
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        });
        expect(result).toMatchObject({ error: 'captions_unavailable' });
    });

    it('TC-13: segmentCount matches number of parsed segments', async () => {
        const segments = Array.from({ length: 20 }, (_, i) => ({ start: i, text: `Word ${i}` }));
        const captionXml = buildMockCaptionXml(segments);
        const pageHtml = buildMockPageHtml([
            { languageCode: 'en', baseUrl: 'https://youtube.com/api/timedtext?v=test' },
        ]);
        const oembedData = { title: 'T', author_name: 'C', thumbnail_url: '' };

        global.fetch = buildFetchMock({ pageHtml, oembedData, captionXml });

        const tools = makeYouTubeToolsImpl(undefined);
        const result = await tools.fetch_youtube_transcript({
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        });
        expect('error' in result).toBe(false);
        if (!('error' in result)) {
            expect(result.segmentCount).toBe(20);
        }
    });

    it('TC-14: wordCount reflects actual words in transcript', async () => {
        // 3 segments × 2 words each = 6 words
        const captionXml = buildMockCaptionXml([
            { start: 0, text: 'hello world' },
            { start: 2, text: 'foo bar' },
            { start: 4, text: 'baz qux' },
        ]);
        const pageHtml = buildMockPageHtml([
            { languageCode: 'en', baseUrl: 'https://youtube.com/api/timedtext?v=test' },
        ]);
        const oembedData = { title: 'T', author_name: 'C', thumbnail_url: '' };

        global.fetch = buildFetchMock({ pageHtml, oembedData, captionXml });

        const tools = makeYouTubeToolsImpl(undefined);
        const result = await tools.fetch_youtube_transcript({
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        });
        expect('error' in result).toBe(false);
        if (!('error' in result)) {
            expect(result.wordCount).toBe(6);
        }
    });

    it('TC-15e: includeTimestamps prepends [M:SS] to each line', async () => {
        const captionXml = buildMockCaptionXml([{ start: 65, text: 'Hello' }]);
        const pageHtml = buildMockPageHtml([
            { languageCode: 'en', baseUrl: 'https://youtube.com/api/timedtext?v=test' },
        ]);
        const oembedData = { title: 'T', author_name: 'C', thumbnail_url: '' };

        global.fetch = buildFetchMock({ pageHtml, oembedData, captionXml });

        const tools = makeYouTubeToolsImpl(undefined);
        const result = await tools.fetch_youtube_transcript({
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            includeTimestamps: true,
        });
        expect('error' in result).toBe(false);
        if (!('error' in result)) {
            expect(result.transcript).toContain('[1:05]');
        }
    });
});

// =============================================================================
// 6. makeYouTubeToolsImpl — WITH orgId (Drive save)
// =============================================================================

describe('makeYouTubeToolsImpl — with orgId', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('TC-10: sets driveFileId when orgId provided and save succeeds', async () => {
        const captionXml = buildMockCaptionXml([{ start: 0, text: 'Hello drive' }]);
        const pageHtml = buildMockPageHtml([
            { languageCode: 'en', baseUrl: 'https://youtube.com/api/timedtext?v=test' },
        ]);
        const oembedData = { title: 'Drive Test', author_name: 'Channel X', thumbnail_url: '' };

        global.fetch = buildFetchMock({ pageHtml, oembedData, captionXml });

        const tools = makeYouTubeToolsImpl('org_thrive_syracuse');
        const result = await tools.fetch_youtube_transcript({
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        });

        expect('error' in result).toBe(false);
        if (!('error' in result)) {
            expect(result.driveFileId).toBe('mock-drive-file-id');
            expect(result.driveFileName).toContain('YouTube Transcript');
            expect(result.driveFileName).toContain('Drive Test');
        }
    });
});
