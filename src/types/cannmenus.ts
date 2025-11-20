
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
  createdAt?: any; // Loosening type for now
  updatedAt?: any;
};

export type ProductDoc = {
  // Original fields
  brand_id: string;
  sku_id: string;
  canonical_name: string;
  alt_names?: string[];
  sub_category?: string;
  size?: string;
  thc_min?: number;
  thc_max?: number;
  barcodes?: string[];

  // Fields added to satisfy route and component usage
  id: string;
  brandId?: string; // camelCase alias
  retailerIds?: string[];
  name: string;
  category?: string;
  strainType?: string | null;
  thcPercent?: number | null;
  cbdPercent?: number | null;
  tags?: string[];
  imageUrl?: string;
  price?: number;
  createdAt?: any;
};

export type RetailerDoc = {
  // Original fields
  id: string;
  name: string;
  state: string;
  city: string;
  postal_code: string;
  country: string;
  street_address: string;
  homepage_url: string | null;
  menu_url: string | null;
  menu_discovery_status: "pending" | "found" | "failed";
  is_priority?: boolean;
  platform_guess?: "dutchie" | "jane" | "bespoke" | "unknown";
  
  // Fields added for compatibility
  slug?: string;
  website_url?: string;
  address?: {
    street?: string;
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    [key: string]: any;
  };
  geo?: {
    lat?: number,
    lng?: number,
  }
  phone?: string;
  carriesBrands?: string[];
  createdAt?: any;
  updatedAt?: any;
};

export type MenuSourceDoc = {
  id: string;
  dispensary_id: string;
  source_type: "website" | "weedmaps" | "leafly";
  url: string;
  platform: "dutchie" | "jane" | "bespoke" | "unknown" | "weedmaps" | "leafly";
  last_success_at?: any;
  last_status: "ok" | "blocked" | "error" | "pending";
  last_hash?: string;
  created_at?: any;
  updated_at?: any;
};

export type RawMenuSnapshotDoc = {
  id: string;
  dispensary_id: string;
  source_id: string;
  taken_at: any;
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
  last_seen_at: any;
  first_seen_at?: any;
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

  createdAt?: any;
  updatedAt?: any;
};
