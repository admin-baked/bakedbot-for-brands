/**
 * Upsell Module Types
 *
 * Defines types for the upsell engine that powers product recommendations
 * across all customer touchpoints: product detail, cart, checkout, and chatbot.
 */

import type { Product } from './products';

// --- Placement & Strategy ---

/** Where the upsell suggestion appears in the customer journey */
export type UpsellPlacement = 'product_detail' | 'cart' | 'checkout' | 'chatbot';

/** Why this product was selected as an upsell */
export type UpsellStrategy =
  | 'terpene_pairing'      // Same/complementary terpene profiles (entourage effect)
  | 'effect_stacking'      // Complementary effects (e.g., Relaxed + Sleepy for nighttime)
  | 'category_complement'  // Cross-category (flower user → suggest edible/accessory)
  | 'potency_ladder'       // Step-up for experienced users, step-down for beginners
  | 'clearance'            // Expiring/slow-moving inventory needs to move
  | 'margin_boost'         // High-margin product promotion (280E optimization)
  | 'bundle_match'         // Active bundle that includes this product
  | 'popular_pairing';     // Co-purchase data (Phase 4 - future)

// --- Suggestions ---

/** A single upsell recommendation with scoring and reasoning */
export interface UpsellSuggestion {
  product: Product;
  strategy: UpsellStrategy;
  reason: string;           // Customer-facing: "Similar terpene profile"
  savingsText?: string;     // "Save 15% in a bundle"
  confidenceScore: number;  // 0-1, from scoring engine
  bundleId?: string;        // If part of an active bundle
  scoreBreakdown?: UpsellScoreBreakdown;
}

/** Detailed scoring breakdown for debugging/analytics */
export interface UpsellScoreBreakdown {
  terpeneEffectMatch: number;   // 0-1
  marginContribution: number;   // 0-1
  inventoryPriority: number;    // 0-1
  categoryComplement: number;   // 0-1
  priceFit: number;             // 0-1
  totalScore: number;           // Weighted composite
}

// --- Engine Input/Output ---

/** Input context for the upsell engine */
export interface UpsellContext {
  placement: UpsellPlacement;
  currentProduct?: Product;       // For product_detail placement
  cartItems?: Product[];          // For cart/checkout placement
  userTolerance?: 'low' | 'medium' | 'high';
  pricePreference?: 'budget' | 'mid' | 'premium';
  maxResults?: number;            // Default 3
  orgId: string;
  excludeProductIds?: string[];   // Products already in cart or being viewed
}

/** Output from the upsell engine */
export interface UpsellResult {
  suggestions: UpsellSuggestion[];
  placement: UpsellPlacement;
  generatedAt: number;
}

// --- Scoring Weights ---

/** Configurable weights for the upsell scoring model */
export interface UpsellScoringWeights {
  terpeneEffectMatch: number;   // Default 0.30
  marginContribution: number;   // Default 0.25
  inventoryPriority: number;    // Default 0.20
  categoryComplement: number;   // Default 0.15
  priceFit: number;             // Default 0.10
}

export const DEFAULT_UPSELL_WEIGHTS: UpsellScoringWeights = {
  terpeneEffectMatch: 0.30,
  marginContribution: 0.25,
  inventoryPriority: 0.20,
  categoryComplement: 0.15,
  priceFit: 0.10,
};

/** Per-placement weight overrides (checkout favors margin/clearance) */
export const PLACEMENT_WEIGHT_OVERRIDES: Record<UpsellPlacement, Partial<UpsellScoringWeights>> = {
  product_detail: {},  // Use defaults
  cart: {
    categoryComplement: 0.20,
    terpeneEffectMatch: 0.25,
  },
  checkout: {
    marginContribution: 0.35,
    inventoryPriority: 0.25,
    terpeneEffectMatch: 0.15,
  },
  chatbot: {},  // Use defaults
};

// --- Cannabis Science Pairing Rules ---

/** Terpene entourage pairings - terpenes that complement each other */
export const TERPENE_PAIRINGS: Record<string, string[]> = {
  myrcene: ['linalool', 'caryophyllene'],       // Relaxation stack
  limonene: ['pinene', 'terpinolene'],           // Energy/uplift stack
  caryophyllene: ['myrcene', 'humulene'],        // Pain relief stack
  linalool: ['myrcene', 'ocimene'],              // Sleep/calm stack
  pinene: ['limonene', 'terpinolene'],           // Focus/clarity stack
  terpinolene: ['limonene', 'pinene'],           // Creative stack
  humulene: ['caryophyllene', 'myrcene'],        // Body relief stack
  ocimene: ['linalool', 'limonene'],             // Mood boost stack
  bisabolol: ['linalool', 'myrcene'],            // Gentle relaxation stack
};

/** Effect complementarity - effects that enhance each other */
export const EFFECT_COMPLEMENTS: Record<string, string[]> = {
  relaxed: ['sleepy', 'calm', 'happy'],
  sleepy: ['relaxed', 'calm'],
  happy: ['euphoric', 'uplifted', 'relaxed'],
  euphoric: ['happy', 'creative', 'uplifted'],
  creative: ['focused', 'euphoric', 'energetic'],
  focused: ['creative', 'energetic', 'uplifted'],
  energetic: ['focused', 'creative', 'uplifted'],
  uplifted: ['happy', 'euphoric', 'energetic'],
  calm: ['relaxed', 'sleepy', 'happy'],
  hungry: ['relaxed', 'happy'],
};

/** Cross-category complements for variety-based upselling */
export const CATEGORY_COMPLEMENTS: Record<string, string[]> = {
  'Flower': ['Pre-roll', 'Edibles', 'Accessories'],
  'Pre-roll': ['Edibles', 'Flower', 'Vapes'],
  'Pre-Rolls': ['Edibles', 'Flower', 'Vapes'],
  'Edibles': ['Flower', 'Tinctures', 'Pre-roll'],
  'Vapes': ['Flower', 'Concentrates', 'Edibles'],
  'Concentrates': ['Vapes', 'Flower', 'Edibles'],
  'Tinctures': ['Edibles', 'Topicals', 'Flower'],
  'Topicals': ['Tinctures', 'Edibles'],
  'Accessories': ['Flower', 'Pre-roll', 'Concentrates'],
};

// --- Customer-Facing Reason Templates ---

/** Templates for generating customer-facing upsell reasons */
export const UPSELL_REASON_TEMPLATES: Record<UpsellStrategy, string> = {
  terpene_pairing: 'Complementary terpene profile',
  effect_stacking: 'Enhances your experience',
  category_complement: 'Complete your session',
  potency_ladder: 'Try something new',
  clearance: 'Limited time deal',
  margin_boost: 'Staff pick',
  bundle_match: 'Bundle & save',
  popular_pairing: 'Customers also enjoy',
};
