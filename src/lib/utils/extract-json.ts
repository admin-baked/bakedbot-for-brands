/**
 * Extract a JSON string from LLM output that may be wrapped in markdown fences.
 * Handles ```json ... ```, ``` ... ```, and plain JSON.
 */
export function extractJsonPayload(text: string): string {
    const trimmed = text.trim();
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
        return fencedMatch[1].trim();
    }
    return trimmed;
}
