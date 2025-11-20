
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
  brand_id: string;
  sku_id: string;
  canonical_name: string;
  alt_names?: string[];
  category?: string;
  sub_category?: string;
  size?: string;
  thc_min?: number;
  thc_max?: number;
  barcodes?: string[];
};

export type RetailerDoc = {
  id: string;
  name: string;
  state: string;
  city: string;
  postal_code: string;
  country: string;
  street_address: string;
  website_url?: string;
  homepage_url: string | null;
  menu_url: string | null;
  menu_discovery_status: "pending" | "found" | "failed";
  is_priority?: boolean;
  platform_guess?: "dutchie" | "jane" | "bespoke" | "unknown";
  createdAt?: Date;
  updatedAt?: Date;
};

export type MenuSourceDoc = {
  id: string;
  dispensary_id: string;
  source_type: "website" | "weedmaps" | "leafly";
  url: string;
  platform: "dutchie" | "jane" | "bespoke" | "unknown" | "weedmaps" | "leafly";
  last_success_at?: Date;
  last_status: "ok" | "blocked" | "error" | "pending";
  last_hash?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type RawMenuSnapshotDoc = {
  id: string;
  dispensary_id: string;
  source_id: string;
  taken_at: Date;
  hash: string;
  raw_payload: string | Record<string, any>; // Can be HTML string or JSON object
  parse_status: "pending" | "parsed" | "failed";
  error_message?: string | null;
};

export type AvailabilityDoc = {
  id: string; // A unique ID for this availability record, e.g., hash(skuId + dispensaryId)
  brand_id: string;
  sku_id: string;
  dispensary_id: string;
  source_type: "website" | "weedmaps" | "leafly";
  price: number;
  sale_price?: number | null;
  in_stock: boolean;
  last_seen_at: Date;
  first_seen_at?: Date;
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
