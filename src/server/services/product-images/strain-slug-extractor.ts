/**
 * Strain Slug Extractor — shared utility
 *
 * Extracts candidate strain slugs from a cannabis product name.
 * Used by both the import pipeline (pre-populate images at sync time)
 * and the Leafly image sync (catalog building).
 *
 * Handles the common Alleaves dash-separated format:
 *   "Brand - Category - Strain - Size"  →  strain slug
 *   "Jaunty - AIO - Blue Dream - 1.5g"  →  "blue-dream"
 *   "Flowerhouse - Flower - Dolato - 3.5g" → "dolato"
 */

function slugify(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

const SIZE_RE = /^\d+(?:\.\d+)?\s*(?:mg|g|oz|ml|pk|ct|pack|count)$/i;
const CATEGORY_RE = /\b(?:aio|pre[-\s]?roll|flower|vape|vapor|cartridge|cart|live\s*resin|live\s*rosin|rosin|wax|shatter|distillate|concentrate|tincture|gumm(?:y|ies)|edible|capsule|oil|extract|hash|kief|badder|sugar|sauce|infused|infusion|single|twin|double|liquid\s*diamonds?|small\s*bud|prerolls?)\b/i;
const BRAND_WORDS_RE = /^(?:jaunty|flowerhouse|melo|koa|nar|cannabals|cannabols|thrive|1906|1937|atidag|revert|kingsroad|hashmaker)\s*$/i;

/**
 * Extract candidate strain slugs from a product name.
 * Returns up to 4 candidates ordered from most-specific to least-specific.
 */
export function extractStrainSlugsFromName(productName: string): string[] {
    const slugs = new Set<string>();

    // --- Strategy 1: Alleaves "Brand - Category - Strain - Size" ---
    const parts = productName.split(/\s+[-–]\s+/);
    if (parts.length >= 3) {
        const strainParts = parts
            .slice(1)
            .filter(p => !SIZE_RE.test(p.trim()) && !CATEGORY_RE.test(p) && !BRAND_WORDS_RE.test(p.trim()))
            .map(p => p.replace(/\([^)]*\)/g, '').trim())
            .filter(Boolean);

        if (strainParts.length > 0) {
            const strainName = strainParts.join(' ')
                .replace(/\d+(?:\.\d+)?\s*(?:mg|g|oz|ml)\b/gi, '')
                .replace(/\b(?:sativa|indica|hybrid)\b/gi, '')
                .replace(/\s+/g, ' ').trim();

            if (strainName.length > 2) {
                const s = slugify(strainName);
                if (s.length > 2) {
                    slugs.add(s);
                    // Also try first two words
                    const words = strainName.split(/\s+/);
                    if (words.length >= 2) slugs.add(slugify(words.slice(0, 2).join(' ')));
                    // Handle cross strains: "Donny Burger x Strawberry Cough"
                    for (const part of strainName.split(/\s+x\s+/i)) {
                        const cs = slugify(part.trim());
                        if (cs.length > 3) slugs.add(cs);
                    }
                }
            }
        }
    }

    // --- Strategy 2: Strip common tokens and slugify remainder ---
    let clean = productName
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\d+(?:\.\d+)?\s*(?:mg|g|oz|ml|pack|count|ct|pk)\b/gi, '')
        .replace(CATEGORY_RE, '')
        .replace(/\b(?:sativa|indica|hybrid|autoflower)\b/gi, '')
        .replace(/\b(?:premium|select|reserve|craft|limited|special|edition|small\s*bud)\b/gi, '')
        .replace(BRAND_WORDS_RE, '')
        .replace(/\s*[-–]\s*/g, ' ')
        .replace(/\s+/g, ' ').trim();

    if (clean.length > 2) {
        const mainSlug = slugify(clean);
        if (mainSlug.length > 2) {
            slugs.add(mainSlug);
            const words = clean.split(/\s+/).filter(w => w.length > 1);
            if (words.length >= 2) slugs.add(slugify(words.slice(0, 2).join(' ')));
        }
    }

    return Array.from(slugs).filter(s => s.length > 2).slice(0, 4);
}
