/**
 * COA (Certificate of Analysis) Parser Service
 *
 * Hybrid pipeline for extracting lab test data from cannabis COA verify pages:
 *   1. Auto: Metrc tag / batch ID → known lab platform URL → parse HTML
 *   2. Manual: Direct COA URL or QR code image → parse
 *   3. Fallback: Unknown platform → LLM extraction from HTML
 *
 * Parsed results are cached in Firestore (COAs never change once published).
 * Cost: ~$0.001/product (cached after first parse).
 */

import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface COAResult {
  source: 'confident_cannabis' | 'sc_labs' | 'mcr_labs' | 'kaycha' | 'acs_labs' | 'green_leaf' | 'llm_fallback' | 'unknown';
  sourceUrl: string;
  productName?: string;
  strainName?: string;
  batchNumber?: string;
  labName?: string;
  testDate?: string;
  overallStatus?: 'pass' | 'fail' | 'pending';

  // Cannabinoid profile
  cannabinoids?: Record<string, { value: number; unit: 'percent' | 'mg_g' }>;
  totalThc?: number;
  totalCbd?: number;
  totalCannabinoids?: number;

  // Terpene profile
  terpenes?: Array<{ name: string; percentage: number }>;
  totalTerpenes?: number;

  // Safety testing
  pesticides?: { passed: boolean; details?: string };
  heavyMetals?: { passed: boolean; details?: string };
  microbials?: { passed: boolean; details?: string };
  residualSolvents?: { passed: boolean; details?: string };
  moisture?: { value: number; unit: 'percent' };

  // Raw data
  rawHtml?: string;
  parsedAt: string;
}

export interface COALookupOptions {
  metrcTag?: string;
  batchId?: string;
  coaUrl?: string;
  productName?: string;
  skipCache?: boolean;
}

// ============================================================================
// Platform URL Patterns
// ============================================================================

interface PlatformMatcher {
  name: COAResult['source'];
  patterns: RegExp[];
  parse: (html: string, url: string) => COAResult | null;
}

const PLATFORM_MATCHERS: PlatformMatcher[] = [
  {
    name: 'confident_cannabis',
    patterns: [
      /confidentcannabis\.com/i,
      /orders\.confidentcannabis\.com/i,
      /share\.confidentcannabis\.com/i,
    ],
    parse: parseConfidentCannabis,
  },
  {
    name: 'sc_labs',
    patterns: [
      /sclabs\.com/i,
      /client\.sclabs\.com/i,
    ],
    parse: parseSCLabs,
  },
  {
    name: 'mcr_labs',
    patterns: [
      /mcrlabs\.com/i,
      /reports\.mcrlabs\.com/i,
    ],
    parse: parseMCRLabs,
  },
  {
    name: 'kaycha',
    patterns: [
      /yourcoa\.com/i,
      /kaychalabs\.com/i,
    ],
    parse: parseKaycha,
  },
  {
    name: 'acs_labs',
    patterns: [
      /acslabcannabis\.com/i,
      /results\.acslabcannabis\.com/i,
    ],
    parse: parseACSLabs,
  },
  {
    name: 'green_leaf',
    patterns: [
      /greenleaflab\.org/i,
    ],
    parse: parseGreenLeaf,
  },
];

// ============================================================================
// Main Entry Points
// ============================================================================

/**
 * Look up COA data for a product by Metrc tag, batch ID, or direct URL.
 * Tries known lab platform URL patterns first, falls back to LLM extraction.
 */
export async function lookupCOA(options: COALookupOptions): Promise<COAResult | null> {
  const { metrcTag, batchId, coaUrl, productName } = options;

  // 1. If we have a direct COA URL, fetch and parse it
  if (coaUrl) {
    return await fetchAndParseCOA(coaUrl);
  }

  // 2. Try to resolve a COA URL from Metrc tag or batch ID
  const resolvedUrl = await resolveCOAUrl(metrcTag, batchId, productName);
  if (resolvedUrl) {
    return await fetchAndParseCOA(resolvedUrl);
  }

  logger.debug('[COA] No COA URL resolved', { metrcTag, batchId, productName });
  return null;
}

/**
 * Extract a COA URL from a QR code image using Gemini Vision.
 * Cost: ~$0.003 per image.
 */
export async function extractQRFromImage(imageUrl: string): Promise<string | null> {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      logger.warn('[COA] Missing GEMINI_API_KEY for QR extraction');
      return null;
    }

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Extract the URL from the QR code in this image. Return ONLY the URL, nothing else. If no QR code is found, return "NONE".' },
              { inlineData: { mimeType: 'image/jpeg', data: await fetchImageAsBase64(imageUrl) } },
            ],
          }],
        }),
      }
    );

    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text || text === 'NONE' || !text.startsWith('http')) return null;
    return text;
  } catch (err) {
    logger.error('[COA] QR extraction failed', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

// ============================================================================
// URL Resolution
// ============================================================================

/**
 * Try to resolve a COA URL from a Metrc tag or batch ID.
 * Checks known URL patterns for major lab platforms.
 */
async function resolveCOAUrl(
  metrcTag?: string,
  batchId?: string,
  productName?: string
): Promise<string | null> {
  if (!metrcTag && !batchId) return null;

  // Known URL patterns to try (most popular platforms first)
  const candidates: string[] = [];

  if (metrcTag) {
    // Confident Cannabis uses Metrc tags in verify URLs
    candidates.push(`https://orders.confidentcannabis.com/report/public/sample/${metrcTag}`);
    candidates.push(`https://www.confidentcannabis.com/verify/${metrcTag}`);
    // Kaycha / yourcoa uses batch IDs
    candidates.push(`https://yourcoa.com/${metrcTag}`);
  }

  if (batchId) {
    candidates.push(`https://orders.confidentcannabis.com/report/public/sample/${batchId}`);
    candidates.push(`https://yourcoa.com/${batchId}`);
  }

  // Try each candidate URL — return the first one that resolves (200 response with content)
  for (const url of candidates) {
    try {
      const resp = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) {
        logger.info('[COA] Resolved COA URL', { url, metrcTag, batchId });
        return url;
      }
    } catch {
      // URL didn't resolve, try next
    }
  }

  return null;
}

// ============================================================================
// Fetch & Parse
// ============================================================================

async function fetchAndParseCOA(url: string): Promise<COAResult | null> {
  try {
    const resp = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BakedBot/1.0; COA Verification)',
      },
    });

    if (!resp.ok) {
      logger.warn('[COA] Fetch failed', { url, status: resp.status });
      return null;
    }

    const html = await resp.text();
    if (html.length < 100) return null;

    // Try platform-specific parsers
    for (const matcher of PLATFORM_MATCHERS) {
      if (matcher.patterns.some(p => p.test(url))) {
        const result = matcher.parse(html, url);
        if (result) {
          logger.info('[COA] Parsed via platform parser', { source: result.source, url });
          return result;
        }
      }
    }

    // Fallback: LLM extraction
    return await llmFallbackParse(html, url);
  } catch (err) {
    logger.error('[COA] Fetch/parse error', { url, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

// ============================================================================
// Platform-Specific Parsers
// ============================================================================

function parseConfidentCannabis(html: string, url: string): COAResult | null {
  return parseGenericCOAHtml(html, url, 'confident_cannabis');
}

function parseSCLabs(html: string, url: string): COAResult | null {
  return parseGenericCOAHtml(html, url, 'sc_labs');
}

function parseMCRLabs(html: string, url: string): COAResult | null {
  return parseGenericCOAHtml(html, url, 'mcr_labs');
}

function parseKaycha(html: string, url: string): COAResult | null {
  return parseGenericCOAHtml(html, url, 'kaycha');
}

function parseACSLabs(html: string, url: string): COAResult | null {
  return parseGenericCOAHtml(html, url, 'acs_labs');
}

function parseGreenLeaf(html: string, url: string): COAResult | null {
  return parseGenericCOAHtml(html, url, 'green_leaf');
}

/**
 * Generic HTML parser that extracts common COA data patterns.
 * Most lab verify pages use similar HTML structures with consistent
 * class names and table layouts. This handles the 80% case.
 */
function parseGenericCOAHtml(
  html: string,
  url: string,
  source: COAResult['source']
): COAResult | null {
  const result: COAResult = {
    source,
    sourceUrl: url,
    parsedAt: new Date().toISOString(),
  };

  // Extract from Open Graph / meta tags (most COA pages have these)
  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1];
  const ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)?.[1];
  if (ogTitle) result.productName = ogTitle;

  // Extract THC/CBD percentages from common patterns
  const thcMatch = html.match(/(?:Total\s+)?THC[\s:]*([0-9]+\.?[0-9]*)\s*%/i);
  const cbdMatch = html.match(/(?:Total\s+)?CBD[\s:]*([0-9]+\.?[0-9]*)\s*%/i);

  if (thcMatch) result.totalThc = parseFloat(thcMatch[1]);
  if (cbdMatch) result.totalCbd = parseFloat(cbdMatch[1]);

  // Extract terpene data — look for common terpene names with percentages
  const terpeneNames = [
    'myrcene', 'limonene', 'caryophyllene', 'linalool', 'pinene',
    'humulene', 'terpinolene', 'ocimene', 'bisabolol', 'geraniol',
    'camphene', 'valencene', 'nerolidol', 'guaiol', 'eucalyptol',
  ];
  const terpenes: Array<{ name: string; percentage: number }> = [];
  for (const name of terpeneNames) {
    // Match patterns like "Myrcene 0.45%" or "β-Myrcene: 0.45"
    const re = new RegExp(`(?:β-|α-)?${name}[\\s:]*([0-9]+\\.?[0-9]*)\\s*%?`, 'i');
    const match = html.match(re);
    if (match) {
      const pct = parseFloat(match[1]);
      if (pct > 0 && pct < 100) {
        terpenes.push({ name: name.charAt(0).toUpperCase() + name.slice(1), percentage: pct });
      }
    }
  }
  if (terpenes.length > 0) result.terpenes = terpenes;

  // Extract total terpenes
  const totalTerpMatch = html.match(/Total\s+Terpenes[\s:]*([0-9]+\.?[0-9]*)\s*%/i);
  if (totalTerpMatch) result.totalTerpenes = parseFloat(totalTerpMatch[1]);

  // Extract pass/fail status
  const passMatch = html.match(/(?:overall|status|result)[\s:]*(?:<[^>]+>)?\s*(pass|fail)/i);
  if (passMatch) result.overallStatus = passMatch[1].toLowerCase() as 'pass' | 'fail';

  // Extract batch/lot number
  const batchMatch = html.match(/(?:batch|lot|sample)\s*(?:#|number|id)?[\s:]*([A-Z0-9\-]{5,})/i);
  if (batchMatch) result.batchNumber = batchMatch[1];

  // Extract lab name
  const labMatch = html.match(/(?:tested\s+by|laboratory|lab\s*name)[\s:]*(?:<[^>]+>)?\s*([^<\n]{3,50})/i);
  if (labMatch) result.labName = labMatch[1].trim();

  // Extract test date
  const dateMatch = html.match(/(?:test\s*date|date\s*tested|report\s*date)[\s:]*(?:<[^>]+>)?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  if (dateMatch) result.testDate = dateMatch[1];

  // Extract strain name
  const strainMatch = html.match(/(?:strain|cultivar)[\s:]*(?:<[^>]+>)?\s*([^<\n]{2,50})/i);
  if (strainMatch) result.strainName = strainMatch[1].trim();

  // Safety panels
  if (/pesticide/i.test(html)) {
    const pestPass = /pesticide[^<]*(?:pass|nd|not\s*detected)/i.test(html);
    result.pesticides = { passed: pestPass };
  }
  if (/heavy\s*metal/i.test(html)) {
    const metalPass = /heavy\s*metal[^<]*(?:pass|nd|not\s*detected)/i.test(html);
    result.heavyMetals = { passed: metalPass };
  }
  if (/microbial/i.test(html)) {
    const microPass = /microbial[^<]*(?:pass|nd|not\s*detected)/i.test(html);
    result.microbials = { passed: microPass };
  }

  // Only return if we got meaningful data
  if (result.totalThc || result.totalCbd || result.terpenes?.length || result.overallStatus) {
    return result;
  }

  return null;
}

// ============================================================================
// LLM Fallback Parser
// ============================================================================

async function llmFallbackParse(html: string, url: string): Promise<COAResult | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  try {
    // Trim HTML to relevant content — strip scripts, styles, headers/footers
    const cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 8000); // Limit to ~8K chars for cost control

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Extract cannabis lab test (COA) data from this text. Return ONLY valid JSON with these fields (omit if not found):
{
  "productName": "string",
  "strainName": "string",
  "batchNumber": "string",
  "labName": "string",
  "testDate": "MM/DD/YYYY",
  "overallStatus": "pass" or "fail",
  "totalThc": number (percentage),
  "totalCbd": number (percentage),
  "totalTerpenes": number (percentage),
  "terpenes": [{"name": "string", "percentage": number}],
  "pesticides": {"passed": boolean},
  "heavyMetals": {"passed": boolean},
  "microbials": {"passed": boolean}
}

Text to parse:
${cleanHtml}`
            }],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;

    // Extract JSON from response (may be wrapped in ```json blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      source: 'llm_fallback',
      sourceUrl: url,
      productName: parsed.productName,
      strainName: parsed.strainName,
      batchNumber: parsed.batchNumber,
      labName: parsed.labName,
      testDate: parsed.testDate,
      overallStatus: parsed.overallStatus,
      totalThc: parsed.totalThc,
      totalCbd: parsed.totalCbd,
      totalTerpenes: parsed.totalTerpenes,
      terpenes: parsed.terpenes,
      pesticides: parsed.pesticides,
      heavyMetals: parsed.heavyMetals,
      microbials: parsed.microbials,
      parsedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[COA] LLM fallback parse failed', { url, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

// ============================================================================
// Helpers
// ============================================================================

async function fetchImageAsBase64(url: string): Promise<string> {
  const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
  const buffer = await resp.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

/**
 * Convert COAResult to the ProductLabResult format used in Firestore.
 */
export function coaToFirestoreLabResult(
  coa: COAResult,
  productId: string
): Record<string, unknown> {
  return {
    productId,
    labName: coa.labName,
    testDate: coa.testDate,
    batchNumber: coa.batchNumber,
    coaUrl: coa.sourceUrl,
    source: coa.source,
    cannabinoids: {
      ...(coa.totalThc != null ? { thc: { value: coa.totalThc, unit: 'percent' } } : {}),
      ...(coa.totalCbd != null ? { cbd: { value: coa.totalCbd, unit: 'percent' } } : {}),
    },
    terpenes: coa.terpenes?.reduce((acc, t) => {
      acc[t.name.toLowerCase()] = { value: t.percentage, unit: 'percent' };
      return acc;
    }, {} as Record<string, { value: number; unit: string }>),
    pesticides: coa.pesticides,
    heavyMetals: coa.heavyMetals,
    microbials: coa.microbials,
    residualSolvents: coa.residualSolvents,
    overallStatus: coa.overallStatus,
    parsedAt: new Date(),
    createdAt: new Date(),
  };
}
