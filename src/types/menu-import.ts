export interface ExtractedProduct {
  name: string;
  brand?: string;
  category: string;
  price: number | null;
  thcPercent?: number | null;
  cbdPercent?: number | null;
  strainType?: string;
  description?: string;
  imageUrl?: string;
  effects?: string[];
  weight?: string;
}

export interface ExtractedBrand {
  name?: string;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  hours?: string;
}

export interface ExtractedPromo {
  title: string;
  subtitle?: string;
  description?: string;
}

export interface MenuExtraction {
  dispensary: ExtractedBrand;
  products: ExtractedProduct[];
  promotions?: ExtractedPromo[];
}
