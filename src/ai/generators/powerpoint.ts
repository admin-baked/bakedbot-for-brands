'use server';

/**
 * PowerPoint generator — deck scripting + presentation rendering + Firebase Storage upload.
 *
 * Flow:
 *   1. GLM 4.7 generates a structured DeckScript (title + bullets + speaker notes)
 *   2. pptxgenjs renders the script into a .pptx Buffer (no tmpdir needed)
 *   3. Buffer is uploaded to Firebase Storage; public URL returned
 *
 * Deck purposes:
 *   pitch     — investor/partner overview (6 slides)
 *   menu      — product showcase for dispensary (6–8 slides)
 *   training  — staff onboarding / SOPs (8 slides)
 *   campaign  — marketing campaign brief (5 slides)
 */

import { logger } from '@/lib/logger';
import { callGLM, GLM_MODELS } from '@/ai/glm';
import type {
    GeneratePowerPointInput,
    GeneratePowerPointOutput,
    DeckScript,
    DeckPurpose,
} from '@/types/powerpoint';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** pptxgenjs expects hex WITHOUT '#' — strip the prefix if present */
function hex(color: string): string {
    return color.startsWith('#') ? color.slice(1) : color;
}

function sanitizeBrandName(name?: string): string {
    return (name || 'deck').toLowerCase().replace(/[^a-z0-9]/g, '-');
}

// ---------------------------------------------------------------------------
// Slide skeleton hints per purpose
// ---------------------------------------------------------------------------

const SLIDE_SKELETONS: Record<DeckPurpose, string> = {
    pitch: `Slide 1: Cover — brand name + tagline
Slide 2: Problem We Solve
Slide 3: Our Solution
Slide 4: How It Works (3 steps)
Slide 5: Traction / Results
Slide 6: Call to Action / Next Steps`,

    menu: `Slide 1: Cover — dispensary name + tagline
Slide 2: Our Story / Brand Values
Slide 3: Featured Flower
Slide 4: Concentrates & Extracts
Slide 5: Edibles & Beverages
Slide 6: Topicals & Accessories
Slide 7: Loyalty Program
Slide 8: Visit Us / Order Online`,

    training: `Slide 1: Cover — training title + date
Slide 2: Learning Objectives (3 goals)
Slide 3: Company Overview & Values
Slide 4: Products 101 — Flower, Concentrates, Edibles
Slide 5: Compliance & Regulatory Rules
Slide 6: Customer Service Standards
Slide 7: POS & Checkout Process
Slide 8: Q&A / Resources`,

    campaign: `Slide 1: Cover — campaign name + headline
Slide 2: Campaign Objective
Slide 3: Target Audience
Slide 4: Creative Strategy (key message + tone)
Slide 5: Channel Plan & Timeline`,
};

// Deck scripting is structured creative writing, not deep strategic reasoning.
// GLM 4.7 gives us better speed/cost balance while keeping output quality high.
const DECK_SCRIPT_MODEL = GLM_MODELS.STANDARD;

function extractDeckScriptJson(raw: string): string {
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

function parseDeckScriptResponse(raw: string): DeckScript {
    const parsed = JSON.parse(extractDeckScriptJson(raw)) as DeckScript;

    if (!parsed || typeof parsed.deckTitle !== 'string' || !Array.isArray(parsed.slides)) {
        throw new Error('Deck script is missing required fields');
    }

    return parsed;
}

// ---------------------------------------------------------------------------
// GLM scripting
// ---------------------------------------------------------------------------

async function scriptDeck(input: GeneratePowerPointInput): Promise<DeckScript> {
    const slideCount = Math.min(Math.max(input.slideCount ?? 6, 3), 10);
    const skeleton = SLIDE_SKELETONS[input.purpose];

    const systemPrompt = `You are a professional cannabis industry presentation designer.
Generate a complete deck script as a JSON object matching this TypeScript type:
{
  deckTitle: string;
  subtitle?: string;
  slides: Array<{ title: string; bullets: string[]; speakerNotes?: string }>;
  disclaimer?: string;
}

RULES (MANDATORY — cannabis compliance):
- No medical or health benefit claims (e.g. "cures", "treats", "heals")
- Include "For adults 21+ only. Keep out of reach of children." disclaimer on last slide and in the disclaimer field
- No targeting minors in any language or imagery suggestion
- 3–5 concise bullets per slide (not full sentences — fragment style)
- speakerNotes should be 1–2 sentences expanding on the slide bullets
- Return ONLY valid JSON, no markdown fences`;

    const userMessage = `Brand: ${input.brandName || 'Cannabis Brand'}
Tagline: ${input.brandTagline || ''}
Purpose: ${input.purpose}
Topic: ${input.topic}
Slide count: ${slideCount}

Use this slide structure as a guide (adapt as needed for the topic):
${skeleton}`;

    const raw = await callGLM({
        userMessage,
        systemPrompt,
        model: DECK_SCRIPT_MODEL,
        maxTokens: 4096,
        temperature: 0.7,
    });

    // Strip possible markdown fences
    try {
        return parseDeckScriptResponse(raw);
    } catch (parseErr) {
        logger.error('[PowerPoint] JSON parse failed', {
            rawPreview: raw.substring(0, 200),
            error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
        throw new Error(`Failed to parse deck script JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
    }
}

// ---------------------------------------------------------------------------
// pptxgenjs rendering
// ---------------------------------------------------------------------------

async function renderDeck(
    script: DeckScript,
    input: GeneratePowerPointInput,
): Promise<Buffer> {
    // Dynamic import to avoid ESM/CJS issues at module load time
    const PptxGenJS = (await import(/* webpackIgnore: true */ 'pptxgenjs' as string)).default;
    const pptx = new PptxGenJS();

    // pptxgenjs requires hex WITHOUT '#' prefix
    const primary = hex(input.primaryColor || '#18181b');
    const accent = hex(input.accentColor || '#22c55e');
    const white = 'FFFFFF';
    const light = 'F4F4F5';
    const bodyText = '27272a';

    // Fetch logo as base64 if provided (pptxgenjs needs data URI for network images)
    let logoData: string | undefined;
    if (input.logoUrl) {
        try {
            const resp = await fetch(input.logoUrl);
            const buf = Buffer.from(await resp.arrayBuffer());
            const mime = resp.headers.get('content-type') || 'image/png';
            logoData = `data:${mime};base64,${buf.toString('base64')}`;
        } catch {
            logger.warn('[PowerPoint] Failed to fetch logo, skipping', { logoUrl: input.logoUrl });
        }
    }

    // ---- Cover slide ----
    const cover = pptx.addSlide();
    cover.background = { color: primary };
    cover.addText(script.deckTitle, {
        x: 0.5, y: 1.5, w: 9, h: 1.5,
        fontSize: 36, bold: true, color: white, align: 'center',
    });
    if (script.subtitle) {
        cover.addText(script.subtitle, {
            x: 0.5, y: 3.2, w: 9, h: 0.8,
            fontSize: 18, color: accent, align: 'center',
        });
    }
    if (logoData) {
        cover.addImage({ data: logoData, x: 4.0, y: 4.4, w: 2.0, h: 0.8, sizing: { type: 'contain', w: 2.0, h: 0.8 } });
    }

    // ---- Content slides ----
    for (const slide of script.slides) {
        const s = pptx.addSlide();
        s.background = { color: light };

        // Title bar
        s.addShape('rect' as Parameters<typeof s.addShape>[0], {
            x: 0, y: 0, w: '100%', h: 1.1,
            fill: { color: primary },
        });
        s.addText(slide.title, {
            x: 0.4, y: 0.1, w: 9.2, h: 0.9,
            fontSize: 22, bold: true, color: white,
        });

        // Bullets
        const bulletText = slide.bullets.map((b) => ({ text: `• ${b}`, options: { breakLine: true } }));
        s.addText(bulletText, {
            x: 0.5, y: 1.3, w: 8.5, h: 4.0,
            fontSize: 16, color: bodyText, valign: 'top',
        });

        // Accent bar at bottom
        s.addShape('rect' as Parameters<typeof s.addShape>[0], {
            x: 0, y: 6.9, w: '100%', h: 0.1,
            fill: { color: accent },
        });

        if (slide.speakerNotes) {
            s.addNotes(slide.speakerNotes);
        }
    }

    // ---- Disclaimer slide ----
    const disclaimer = script.disclaimer || 'For adults 21+ only. Keep out of reach of children.';
    const last = pptx.addSlide();
    last.background = { color: primary };
    last.addText('Important Disclaimer', {
        x: 0.5, y: 1.0, w: 9, h: 0.8,
        fontSize: 22, bold: true, color: white, align: 'center',
    });
    last.addText(disclaimer, {
        x: 0.5, y: 2.2, w: 9, h: 1.5,
        fontSize: 14, color: accent, align: 'center', italic: true,
    });

    const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
    return buffer;
}

// ---------------------------------------------------------------------------
// Firebase Storage upload
// ---------------------------------------------------------------------------

async function uploadDeck(buffer: Buffer, input: GeneratePowerPointInput, safeName: string): Promise<string> {
    const { getStorage } = await import('firebase-admin/storage');
    const storage = getStorage();
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'bakedbot-global-assets';
    const bucket = storage.bucket(bucketName);

    const fileName = `generated-decks/${safeName}-${input.purpose}-${Date.now()}.pptx`;

    await bucket.file(fileName).save(buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        metadata: {
            metadata: {
                generatedBy: 'deck-builder',
                purpose: input.purpose,
                brandName: input.brandName || '',
            },
        },
    });

    // Signed URLs keep deck downloads working even when bucket ACL mutations are blocked.
    const [downloadUrl] = await bucket.file(fileName).getSignedUrl({
        action: 'read',
        expires: '03-01-2500',
    });
    return downloadUrl;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generatePowerPoint(
    input: GeneratePowerPointInput,
): Promise<GeneratePowerPointOutput> {
    logger.info('[PowerPoint] Starting deck generation', {
        purpose: input.purpose,
        brandName: input.brandName,
        slideCount: input.slideCount,
    });

    const script = await scriptDeck(input);
    logger.info('[PowerPoint] Script generated', { slides: script.slides.length });

    const buffer = await renderDeck(script, input);
    logger.info('[PowerPoint] Deck rendered', { bytes: buffer.length });

    const safeName = sanitizeBrandName(input.brandName);
    const downloadUrl = await uploadDeck(buffer, input, safeName);
    logger.info('[PowerPoint] Uploaded', { downloadUrl });

    return {
        downloadUrl,
        fileName: `${safeName}-${input.purpose}.pptx`,
        slideCount: script.slides.length + 2, // +cover +disclaimer
        purpose: input.purpose,
        generatedBy: 'deck-builder',
    };
}

