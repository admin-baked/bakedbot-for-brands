/**
 * COA Lookup Tool — Agent-callable wrapper for COA parser service.
 *
 * Allows Smokey, Deebo, and other agents to look up lab test results
 * for a product by Metrc tag, batch ID, or direct COA URL.
 */

import { z } from 'zod';
import { lookupCOA, extractQRFromImage } from '@/server/services/coa/coa-parser';
import type { COAResult } from '@/server/services/coa/coa-parser';
import { logger } from '@/lib/logger';

// --- Tool Definition ---
export const coaLookupToolDef = {
  name: 'lookupCOA',
  description:
    'Look up a Certificate of Analysis (COA) for a cannabis product. Provide a Metrc tag, batch ID, or direct COA URL to get lab test results including THC/CBD percentages, terpene profile, and safety testing (pesticides, heavy metals, microbials). Use this to verify product quality, answer potency questions, or provide science-backed product details.',
  schema: z.object({
    metrcTag: z
      .string()
      .optional()
      .describe('METRC traceability tag (e.g. "1A412030000013B000011417")'),
    batchId: z
      .string()
      .optional()
      .describe('POS batch ID for the product'),
    coaUrl: z
      .string()
      .optional()
      .describe('Direct URL to a COA verify page (e.g. from Confident Cannabis, SC Labs)'),
    productName: z
      .string()
      .optional()
      .describe('Product name for context/logging'),
  }),
};

export const qrScanToolDef = {
  name: 'scanCOAQRCode',
  description:
    'Scan a QR code from a product packaging image to extract the COA URL, then parse the lab results. Upload a photo of the product packaging QR code.',
  schema: z.object({
    imageUrl: z
      .string()
      .describe('URL of the product packaging image containing a QR code'),
  }),
};

// --- Tool Implementations ---

export async function lookupCOATool(
  metrcTag?: string,
  batchId?: string,
  coaUrl?: string,
  productName?: string
): Promise<string> {
  try {
    const result = await lookupCOA({ metrcTag, batchId, coaUrl, productName });
    if (!result) {
      return 'No COA data found for this product. Try providing a direct COA URL or Metrc tag.';
    }
    return formatCOAResult(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[COA Tool] Lookup failed', { error: msg });
    return `COA lookup failed: ${msg}`;
  }
}

export async function scanCOAQRCodeTool(imageUrl: string): Promise<string> {
  try {
    const qrUrl = await extractQRFromImage(imageUrl);
    if (!qrUrl) {
      return 'No QR code found in the image, or it does not contain a valid URL.';
    }

    const result = await lookupCOA({ coaUrl: qrUrl });
    if (!result) {
      return `QR code resolved to ${qrUrl} but no lab data could be extracted from the page.`;
    }
    return formatCOAResult(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[COA Tool] QR scan failed', { error: msg });
    return `QR scan failed: ${msg}`;
  }
}

// --- Formatter ---

function formatCOAResult(r: COAResult): string {
  const lines: string[] = [];

  lines.push(`📋 COA Lab Results (${r.source})`);
  if (r.productName) lines.push(`Product: ${r.productName}`);
  if (r.strainName) lines.push(`Strain: ${r.strainName}`);
  if (r.labName) lines.push(`Lab: ${r.labName}`);
  if (r.testDate) lines.push(`Tested: ${r.testDate}`);
  if (r.batchNumber) lines.push(`Batch: ${r.batchNumber}`);
  if (r.overallStatus) lines.push(`Status: ${r.overallStatus.toUpperCase()}`);

  // Potency
  if (r.totalThc != null || r.totalCbd != null) {
    lines.push(`\nPotency:`);
    if (r.totalThc != null) lines.push(`  THC: ${r.totalThc}%`);
    if (r.totalCbd != null) lines.push(`  CBD: ${r.totalCbd}%`);
    if (r.totalCannabinoids != null) lines.push(`  Total Cannabinoids: ${r.totalCannabinoids}%`);
  }

  // Terpenes
  if (r.terpenes?.length) {
    lines.push(`\nTerpene Profile (${r.totalTerpenes ? r.totalTerpenes + '% total' : r.terpenes.length + ' detected'}):`);
    for (const t of r.terpenes.sort((a, b) => b.percentage - a.percentage)) {
      lines.push(`  ${t.name}: ${t.percentage}%`);
    }
  }

  // Safety
  const safety: string[] = [];
  if (r.pesticides) safety.push(`Pesticides: ${r.pesticides.passed ? 'PASS' : 'FAIL'}`);
  if (r.heavyMetals) safety.push(`Heavy Metals: ${r.heavyMetals.passed ? 'PASS' : 'FAIL'}`);
  if (r.microbials) safety.push(`Microbials: ${r.microbials.passed ? 'PASS' : 'FAIL'}`);
  if (r.residualSolvents) safety.push(`Residual Solvents: ${r.residualSolvents.passed ? 'PASS' : 'FAIL'}`);
  if (safety.length) {
    lines.push(`\nSafety Testing:`);
    safety.forEach(s => lines.push(`  ${s}`));
  }

  lines.push(`\nSource: ${r.sourceUrl}`);

  return lines.join('\n');
}
