import type { DeckScript } from '@/types/powerpoint';

export function extractDeckScriptJson(raw: string): string {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
    if (fenced) {
        return fenced.trim();
    }

    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end > start) {
        return raw.slice(start, end + 1).trim();
    }

    return raw.trim();
}

export function parseDeckScriptResponse(raw: string): DeckScript {
    const parsed = JSON.parse(extractDeckScriptJson(raw)) as DeckScript;

    if (!parsed || typeof parsed.deckTitle !== 'string' || !Array.isArray(parsed.slides)) {
        throw new Error('Deck script is missing required fields');
    }

    return parsed;
}
