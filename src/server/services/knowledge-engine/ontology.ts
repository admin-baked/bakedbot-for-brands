/**
 * Knowledge Engine — Ontology
 *
 * Canonical name normalization, duplicate detection keys,
 * and entity/edge type validation for Phase 1.
 */

import type { EntityType } from './types';
import crypto from 'crypto';

// =============================================================================
// PHASE 1 ACTIVE ENTITY TYPES
// =============================================================================

export const PHASE1_ENTITY_TYPES: EntityType[] = [
  'brand',
  'competitor',
  'product',
  'campaign',
  'playbook',
  'flow',
];

// =============================================================================
// CANONICAL NAME
// =============================================================================

/**
 * Normalize entity name to canonical form:
 * - trim whitespace
 * - lowercase
 * - collapse repeated whitespace to single space
 */
export function toCanonicalName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// =============================================================================
// DUPLICATE DETECTION
// =============================================================================

/**
 * Primary dedup key for entities: (tenantId, entityType, canonicalName)
 */
export function entityDedupKey(
  tenantId: string,
  entityType: EntityType,
  canonicalName: string
): string {
  return `${tenantId}::${entityType}::${canonicalName}`;
}

/**
 * Secondary dedup key for entities with an external ref
 */
export function entityExternalRefKey(
  tenantId: string,
  entityType: EntityType,
  externalRef: string
): string {
  return `${tenantId}::${entityType}::ext::${externalRef}`;
}

/**
 * Dedup key for edges: (tenantId, fromId, toId, edgeType)
 */
export function edgeDedupKey(
  tenantId: string,
  fromId: string,
  toId: string,
  edgeType: string
): string {
  return `${tenantId}::${fromId}::${toId}::${edgeType}`;
}

// =============================================================================
// SOURCE CHECKSUM
// =============================================================================

/**
 * SHA-256 checksum for a knowledge source.
 * Used to detect duplicate ingestion of the same source.
 */
export function computeSourceChecksum(
  tenantId: string,
  sourceRef: string,
  content: string
): string {
  return crypto
    .createHash('sha256')
    .update(`${tenantId}::${sourceRef}::${content}`)
    .digest('hex');
}

// =============================================================================
// CLAIM TEXT VALIDATION
// =============================================================================

import { INGESTION_RULES } from './constants';

export function validateClaimText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length > INGESTION_RULES.CLAIM_MAX_CHARS) {
    return trimmed.slice(0, INGESTION_RULES.CLAIM_MAX_CHARS - 1) + '…';
  }
  return trimmed;
}

// =============================================================================
// ID GENERATION
// =============================================================================

export function generateKnowledgeId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${ts}${rand}`;
}
