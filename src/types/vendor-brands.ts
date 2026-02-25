/**
 * Vendor Brand — a cannabis brand that a dispensary carries on their shelves.
 *
 * Dispensaries like Thrive sell products from STIIIZY, Kiva, Wyld, Alien Labs, etc.
 * Ingesting a vendor brand's lightweight profile lets Smokey speak knowledgeably
 * about each brand when customers ask — "tell me about Kiva" or "what's Wyld like?"
 *
 * Storage: tenants/{orgId}/vendor_brands/{vendorBrandId}
 */

export interface VendorBrand {
  id: string;
  orgId: string;

  /** Display name, e.g. "Kiva Confections" */
  name: string;

  /** Homepage URL used for ingestion, e.g. "kivaconfections.com" */
  website: string;

  /** Extracted logo URL (og:image or favicon) */
  logoUrl?: string;

  /** Primary brand hex color (e.g. "#2d6a4f") */
  primaryColor?: string;

  /** Short brand description / tagline */
  description?: string;

  /** 2–4 sentence brand story / mission */
  brandStory?: string;

  /** Personality keywords ("sophisticated", "health-focused", "premium") */
  voiceKeywords?: string[];

  /** Named product lines carried by this dispensary ("Camino", "Terra Bites") */
  productLines?: string[];

  /** Cannabis categories this brand specializes in ("Edibles", "Vapes") */
  categories?: string[];

  /** Confidence score from the extractor (0–100) */
  extractionConfidence?: number;

  ingestedAt: Date;
  lastUpdatedAt: Date;
}

/** Slim version used in Smokey's context window */
export interface VendorBrandContext {
  name: string;
  description?: string;
  brandStory?: string;
  voiceKeywords?: string[];
  productLines?: string[];
  categories?: string[];
}
