
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
  chatbotConfig?: {
    basePrompt?: string;
    welcomeMessage?: string;
    personality?: string;
    tone?: string;
    sellingPoints?: string;
    updatedAt?: any;
  };
};

// This type now represents a document in the 'productReviewEmbeddings' subcollection.
export type ReviewSummaryEmbedding = {
  productId: string; // Denormalized for collection group queries
  brandId: string; // Denormalized for filtering
  model: string;
  embedding: number[];
  reviewCount: number;
  updatedAt: Date;
  summary: string; // The summary text that was embedded
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
    discount?: number;
    fees?: number;
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

export type ServerOrderPayload = {
  items: Array<{
    productId: string;
    name: string;
    qty: number;
    price: number;
  }>;
  customer: { name: string; email: string; };
  retailerId: string;
  totals: { subtotal: number; tax: number; total: number; discount?: number; fees?: number };
}


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

// --- Event Spine ---

export type Agent =
  | 'smokey'
  | 'reach'
  | 'craig'
  | 'pops'
  | 'ezal'
  | 'mrs_parker'
  | 'money_mike'
  | 'deebo';

export type EventType =
  // Reach
  | 'reach.entry'
  // Smokey
  | 'recommendation.shown'
  | 'cart.updated'
  | 'checkout.started'
  | 'checkout.intentCreated'
  | 'checkout.paid'
  | 'checkout.failed'
  // Order Fulfillment
  | 'order.readyForPickup'
  | 'order.completed'
  // SaaS Billing
  | 'subscription.planSelected'
  | 'subscription.paymentAuthorized'
  | 'subscription.updated'
  | 'subscription.failed';


export type AppEvent = {
  id: string;
  type: EventType;
  agent: Agent | 'system';
  orgId: string;
  refId: string | null; // orderId, subscriptionId, customerId, etc.
  data: any; // The event payload
  timestamp: Timestamp;
};


// --- Deebo Regulation OS ---

export type Jurisdiction = {
  id: string; // e.g. 'us-ca'
  name: string;
  type: 'state' | 'federal' | 'messaging_standard';
  status: 'active' | 'pending' | 'sunset';
  default_channels: string[];
};

export type RegulationSource = {
  id: string;
  jurisdiction_id: string;
  title: string;
  source_type: 'pdf_upload' | 'pdf_url' | 'html_url';
  url?: string;
  file_path?: string;
  effective_date: Timestamp;
  last_amended_date: Timestamp;
  canonical: boolean;
  topics: string[];
  hash: string;
};

export type ComplianceRule = {
  id: string;
  jurisdiction_id: string;
  source_id: string;
  category: 'marketing' | 'age_verification' | 'packaging_labeling' | 'pos' | 'delivery' | 'testing' | 'recordkeeping';
  channel: 'web' | 'sms' | 'email' | 'social' | 'billboard';
  severity: 'block' | 'warn' | 'info';
  condition: Record<string, any>;
  constraint: Record<string, any>;
  message_template: string;
  effective_date: Timestamp;
  sunset_date?: Timestamp;
  version: number;
};

export type RulePack = {
  id: string;
  jurisdiction_id: string;
  name: string;
  channels: string[];
  categories: string[];
  rule_ids: string[];
  model_version?: string;
  status: 'draft' | 'active' | 'deprecated';
  created_by: string;
  approved_by?: string;
};

// --- Playbooks & Agent OS ---

export type PlaybookDraft = {
  id: string;
  name: string;
  description: string;
  type: 'signal' | 'automation';
  agents: string[];
  signals: string[];
  targets: string[];
  constraints: string[];
};

export type PlaybookKind = 'signal' | 'automation';

export type Playbook = {
  id: string;
  brandId: string;
  name: string;
  description?: string;
  kind: PlaybookKind; // e.g. 'signal' or 'automation'
  tags: string[];
  enabled: boolean;
  // Timestamps are optional for now so we don't break anything if absent
  createdAt?: Date;
  updatedAt?: Date;
};
