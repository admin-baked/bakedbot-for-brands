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
  // For future analytics / bookkeeping
  createdAt?: Date;
  updatedAt?: Date;
};

export type ProductDoc = {
  id: string;
  brandId: string;
  brandSlug?: string;
  name: string;
  category: string;
  strainType?: string;
  thcPercent?: number;
  cbdPercent?: number;
  size?: string;
  imageUrl?: string;
  tags?: string[];
  retailerIds?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type RetailerDoc = {
  id: string;
  name: string;
  slug?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  geo?: {
    lat: number;
    lng: number;
  };
  phone?: string;
  website?: string;
  carriesBrands?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

// ---- Embeddings for RAG over CannMenus data ----

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
