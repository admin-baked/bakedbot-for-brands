/**
 * Fetch YouTube transcripts for BakedBot blog article seeds.
 * Outputs: reports/youtube-transcripts.json
 *
 * Videos:
 *   _JekbpOSAiA — Conversation with Martez Knox (BakedBot CEO)
 *   ITBU-GJvmBs — ai & cannabis with martez knox
 *   0DyKmwckdGg — Benzinga Chicago 2023
 *   YnzXXrcb8oo — Martez Knox Revolutionizing Cannabis with AI
 */

import { writeFileSync, mkdirSync } from 'fs';

const SEGMENTS_PER_PARAGRAPH = 15; // ~5–8 seconds each → readable ~60–90 word chunks

const VIDEOS = [
    { id: '_JekbpOSAiA', slug: 'martez-knox-ceo-interview' },
    { id: 'ITBU-GJvmBs', slug: 'ai-cannabis-martez-knox' },
    { id: '0DyKmwckdGg', slug: 'benzinga-chicago-2023' },
    { id: 'YnzXXrcb8oo', slug: 'revolutionizing-cannabis-ai' },
];

function stripHtmlEntities(text) {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<[^>]+>/g, '');
}

async function fetchMetadata(videoId) {
    try {
        const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) return { title: `YouTube Video ${videoId}`, channel: 'Unknown', thumbnailUrl: '' };
        const data = await res.json();
        return {
            title: data.title || `YouTube Video ${videoId}`,
            channel: data.author_name || 'Unknown',
            thumbnailUrl: data.thumbnail_url || '',
        };
    } catch {
        return { title: `YouTube Video ${videoId}`, channel: 'Unknown', thumbnailUrl: '' };
    }
}

async function fetchTranscript(videoId) {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(20000),
    });

    if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status}`);

    const html = await pageRes.text();
    const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/);
    if (!match) throw new Error('Could not parse player response');

    const playerResponse = JSON.parse(match[1]);
    const captionTracks = playerResponse?.captions
        ?.playerCaptionsTracklistRenderer
        ?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) throw new Error('No captions available');

    const track = captionTracks.find(t => t.languageCode === 'en') ?? captionTracks[0];
    const captionRes = await fetch(track.baseUrl, { signal: AbortSignal.timeout(10000) });
    if (!captionRes.ok) throw new Error('Could not fetch captions');

    const xml = await captionRes.text();
    const segmentRegex = /<text\s[^>]*start="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
    const segments = [];
    let m;
    while ((m = segmentRegex.exec(xml)) !== null) {
        const text = stripHtmlEntities(m[2]).trim();
        if (text) segments.push(text);
    }

    const paragraphs = [];
    for (let i = 0; i < segments.length; i += SEGMENTS_PER_PARAGRAPH) {
        paragraphs.push(segments.slice(i, i + SEGMENTS_PER_PARAGRAPH).join(' '));
    }

    return { text: paragraphs.join('\n\n'), segmentCount: segments.length };
}

async function processVideo({ id, slug }) {
    console.log(`[fetch] ${id} (${slug})...`);
    try {
        const [metadata, transcriptData] = await Promise.all([
            fetchMetadata(id),
            fetchTranscript(id),
        ]);
        const wordCount = transcriptData.text.split(/\s+/).filter(Boolean).length;
        console.log(`[ok] ${id} — "${metadata.title}" — ${wordCount} words`);
        return { id, slug, ...metadata, ...transcriptData, wordCount, error: null };
    } catch (err) {
        console.error(`[error] ${id}: ${err.message}`);
        return { id, slug, title: '', channel: '', thumbnailUrl: '', text: '', segmentCount: 0, wordCount: 0, error: err.message };
    }
}

const results = await Promise.all(VIDEOS.map(processVideo));

mkdirSync('reports', { recursive: true });
writeFileSync('reports/youtube-transcripts.json', JSON.stringify(results, null, 2));
console.log('\nSaved: reports/youtube-transcripts.json');
console.log('Successful:', results.filter(r => !r.error).length, '/', results.length);
