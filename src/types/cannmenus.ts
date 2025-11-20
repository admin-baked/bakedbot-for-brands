// src/types/cannmenus.ts

export type BrandDoc = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  categories?: string[];
  website?: string;
  socials?: {
    instagram?: string;
  };
  markets?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type ProductDoc = {
  id: string; // This is the SKU ID in the new model, e.g., 'sku_40tons_gg4_3_5g'
  brandId: string;
  canonicalName: string;
  altNames?: string[];
  category?: string;
  subCategory?: string;
  size?: string;
  thcMin?: number;
  thcMax?: number;
  barcodes?: string[];
  imageUrl?: string; // Canonical image
  createdAt?: Date;
  updatedAt?: Date;
};

export type RetailerDoc = {
  id: string;
  name: string;
  state: string;
  city: string;
  websiteUrl?: string;
  isPriority?: boolean;
  platformGuess?: 'dutchie' | 'jane' | 'bespoke' | 'unknown';
  createdAt?: Date;
  updatedAt?: Date;
};

export type MenuSourceDoc = {
  id: string;
  dispensaryId: string;
  sourceType: 'website' | 'weedmaps' | 'leafly';
  url: string;
  platform: 'dutchie' | 'jane' | 'bespoke' | 'unknown' | 'weedmaps' | 'leafly';
  lastSuccessAt?: Date;
  lastStatus: 'ok' | 'blocked' | 'error' | 'pending';
  lastHash?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type RawMenuSnapshotDoc = {
  id: string;
  dispensaryId: string;
  sourceId: string;
  takenAt: Date;
  hash: string;
  rawPayload: string | Record<string, any>; // Can be HTML string or JSON object
  parseStatus: 'pending' | 'parsed' | 'failed';
  errorMessage?: string | null;
};

export type AvailabilityDoc = {
  id: string; // A unique ID for this availability record, e.g., hash(skuId + dispensaryId)
  brandId: string;
  skuId: string;
  dispensaryId: string;
  sourceType: 'website' | 'weedmaps' | 'leafly';
  price: number;
  salePrice?: number | null;
  inStock: boolean;
  lastSeenAt: Date;
  firstSeenAt?: Date;
};


// --- Embeddings for RAG over CannMenus data ---

export type CannmenusEmbeddingDoc = {
  id: string; // same as productId or a composite key
  type: "product" | "brand" | "retailer";
  refId: string; // e.g. productId
  brandId?: string;
  retailerIds?: string[];

  // The text we embedded (for debugging)
  text: string;

  // Vector embedding
  embedding: number[];

  // Basic filters / metadata
  tags?: string[];
  markets?: string[]; // e.g. ["CA", "IL"]

  createdAt?: Date;
  updatedAt?: Date;
};