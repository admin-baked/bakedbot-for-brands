/**
 * Vibe Template Marketplace Types
 *
 * Community-submitted templates for Vibe IDE projects.
 */

import type { VibeConfig } from './vibe';
import type { VibeCodeFile } from './vibe-code';

export interface VibeTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];

  // Template content
  vibeConfig: Partial<VibeConfig>;
  codeFiles?: VibeCodeFile[]; // Optional starter code
  features: TemplateFeature[];

  // Preview assets
  thumbnailUrl: string;
  previewImages: string[];
  livePreviewUrl?: string;

  // Creator info
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  isOfficial: boolean; // BakedBot-verified templates

  // Stats
  downloads: number;
  favorites: number;
  rating: number; // 0-5
  ratingCount: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  status: TemplateStatus;

  // Monetization (optional)
  isPremium: boolean;
  price?: number;
}

export type TemplateCategory =
  | 'dispensary' // Full dispensary websites
  | 'menu' // Product menu/catalog
  | 'landing' // Landing pages
  | 'ecommerce' // E-commerce stores
  | 'blog' // Content/blog sites
  | 'dashboard' // Admin dashboards
  | 'mobile' // Mobile app UIs
  | 'other';

export type TemplateFeature =
  | 'products'
  | 'orders'
  | 'cart'
  | 'search'
  | 'auth'
  | 'reviews'
  | 'loyalty'
  | 'blog'
  | 'admin';

export type TemplateStatus =
  | 'draft' // Not published
  | 'pending' // Awaiting review
  | 'published' // Live in marketplace
  | 'rejected' // Failed review
  | 'archived'; // Removed from marketplace

export interface TemplateReview {
  id: string;
  templateId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  helpful: number; // Upvotes
}

export interface TemplateFavorite {
  id: string;
  templateId: string;
  userId: string;
  createdAt: string;
}

export interface TemplateDownload {
  id: string;
  templateId: string;
  userId: string;
  createdAt: string;
}

export interface TemplateSubmission {
  // Same as VibeTemplate but for submission flow
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  vibeConfig: Partial<VibeConfig>;
  codeFiles?: VibeCodeFile[];
  features: TemplateFeature[];
  thumbnailFile?: File; // For upload
  previewFiles?: File[]; // For upload
}

export interface TemplateFilter {
  category?: TemplateCategory;
  tags?: string[];
  features?: TemplateFeature[];
  isPremium?: boolean;
  isOfficial?: boolean;
  minRating?: number;
  sortBy?: 'popular' | 'recent' | 'rating' | 'downloads';
}

export interface TemplateSearchResult {
  templates: VibeTemplate[];
  total: number;
  hasMore: boolean;
}
