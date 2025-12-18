/**
 * Google Places Types
 * Types for Places API integration with TTL-based caching
 */

// ============== Place Document (Permanent Storage) ==============

export interface PlaceDoc {
    placeId: string;
    canonicalName: string;
    primaryAddress: string;
    sources: PlaceSource;
    createdAt: Date;
    updatedAt: Date;
}

export interface PlaceSource {
    resolvedBy: 'auto' | 'manual';
    confidence: number; // 0-1
    lastVerifiedAt: Date;
}

// ============== Place Snapshot (TTL ≤ 30 days) ==============

export interface PlaceSnapshot {
    snapshotId: string;
    placeId: string;
    fetchedAt: Date;
    expiresAt: Date; // Firestore TTL

    // Basic info
    displayName: string;
    formattedAddress: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;

    // Ratings
    rating?: number;
    userRatingCount?: number;

    // Hours
    regularOpeningHours?: PlaceOpeningHours;
    currentOpeningHours?: PlaceOpeningHours;

    // Reviews (max 5 from Google)
    reviews?: GooglePlaceReview[];

    // Links
    googleMapsLinks?: {
        directions?: string;
        placeUri?: string;
        writeReview?: string;
    };

    // Attribution (required by Google TOS)
    attributions?: string[];
}

export interface PlaceOpeningHours {
    openNow?: boolean;
    periods?: PlaceOpeningPeriod[];
    weekdayDescriptions?: string[];
}

export interface PlaceOpeningPeriod {
    open: { day: number; hour: number; minute: number; };
    close?: { day: number; hour: number; minute: number; };
}

// ============== Google Reviews (max 5 per TOS) ==============

export interface GooglePlaceReview {
    authorName: string;
    authorUri?: string;
    authorPhotoUri?: string;
    rating: number;
    text?: string;
    relativePublishTimeDescription: string;
    publishTime?: string;

    // Required by Google TOS when displaying reviews
    flagContentUri?: string;
}

// ============== Field Masks for API Requests ==============

export const PLACE_FIELD_MASKS = {
    // Dispensary page - full details
    dispensaryPage: [
        'id',
        'displayName',
        'formattedAddress',
        'nationalPhoneNumber',
        'websiteUri',
        'rating',
        'userRatingCount',
        'regularOpeningHours',
        'currentOpeningHours',
        'reviews',
        'googleMapsLinks',
    ],

    // Brand "where to buy" - minimal
    brandWhereToBuy: [
        'id',
        'displayName',
        'rating',
        'userRatingCount',
        'currentOpeningHours',
        'googleMapsLinks',
    ],

    // Shop listing - compact
    shopListing: [
        'id',
        'displayName',
        'rating',
        'userRatingCount',
        'currentOpeningHours',
    ],
} as const;

// ============== Places API Request/Response ==============

export interface PlacesSearchInput {
    textQuery: string;
    locationBias?: {
        lat: number;
        lng: number;
        radiusMeters?: number;
    };
    includedTypes?: string[];
    maxResultCount?: number;
}

export interface PlaceDetailsInput {
    placeId: string;
    fieldMask: string[];
    languageCode?: string;
}

// ============== Dispensary Extension ==============

export interface DispensaryGoogleData {
    placeId: string | null;
    placeConfidence: number;
    lastEnrichedAt: Date | null;
}

// ============== Configuration ==============

export const PLACES_CONFIG = {
    // Snapshot TTL (Google TOS: ≤ 30 days)
    snapshotTTLDays: 28,

    // Rate limiting
    maxRequestsPerMinute: 60,

    // Matching thresholds
    minConfidenceForAutoMatch: 0.7,

    // API limits
    maxReviewsPerPlace: 5,
} as const;
