
// src/types/domain.ts

import { Timestamp } from 'firebase/firestore';

export type UserProfile = {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'brand' | 'dispensary' | 'customer' | 'owner' | null;
  brandId: string | null;
  locationId: string | null;
  favoriteRetailerId?: string | null;
};

export type Brand = {
  id: string;
  name: string;
  logoUrl?: string;
  chatbotConfig: {
    basePrompt: string;
    welcomeMessage: string;
  };
};

// Type for the review summary embedding stored on a Product
export type ReviewSummaryEmbedding = {
  embedding: number[];
  reviewCount: number;
  updatedAt: Date;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  prices?: { [retailerId: string]: number };
  imageUrl: string;
  imageHint: string;
  description: string;
  likes?: number;
  dislikes?: number;
  brandId: string;
  reviewSummaryEmbedding?: ReviewSummaryEmbedding; // Add embedding field
};

// Renamed from Location to Retailer
export type Retailer = {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    email?: string;
    lat?: number;
    lon?: number;
    distance?: number;
    // New fields for B2B2C model
    tabletDeviceToken?: string | null;
    acceptsOrders?: boolean;
    status?: 'active' | 'inactive';
};

export type Location = Retailer & { zipCode?: string };

export type Order = {
  id: string;
  customer: string;
  date: string;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
  total: number;
};

export type CartItem = Product & { quantity: number };

export type Review = {
  id: string;
  brandId?: string;
  productId: string;
  userId: string;
  rating: number;
  text: string;
  createdAt: Timestamp;
};

// This is a simple type for the server action's return value.
export type OrderStatus = 'submitted' | 'confirmed' | 'ready' | 'completed' | 'cancelled';

export type Coupon = {
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number; // e.g., 20 for 20% or 10 for $10
    expiresAt?: Timestamp;
    uses: number;
    maxUses?: number;
    brandId: string;
};

// Type for the Order document stored in Firestore
export type OrderDoc = {
  id: string; // Add id to the type
  brandId: string;
  userId: string; // Now required
  customer: {
      name: string;
      email: string;
  };
  items: Array<{
      productId: string;
      name: string;
      qty: number;
      price: number;
  }>;
  totals: {
      subtotal: number;
      tax: number;
      discount: number;
      total: number;
  };
  coupon?: {
    code: string;
    discount: number;
  };
  retailerId: string; // Renamed from locationId
  createdAt: Timestamp;
  status: OrderStatus;
  mode: 'demo' | 'live';
  updatedAt?: Timestamp; // For tracking status changes
};


// Type for the OrderItem sub-collection documents
export type OrderItemDoc = {
  id: string; // Add id to the type
  productId: string;
  productName: string;
  quantity: number;
  price: number;
};

export type UserInteraction = {
  id: string;
  brandId: string;
  userId: string;
  interactionDate: Timestamp;
  query: string;
  recommendedProductIds?: string[];
};
