'use server';

/**
 * Page Status Actions for the Public Pages hub
 *
 * Fetches page status + content for /dashboard/menu tabs.
 * Returns all page data in one call so child tabs don't re-fetch.
 */

import { getBrandPage, toggleBrandPagePublish } from '@/server/actions/brand-pages';
import type {
    BrandPageType,
    LocationInfo,
    ZipSeoPageContent,
} from '@/types/brand-pages';

export interface PageStatus {
    pageType: BrandPageType;
    isPublished: boolean;
    updatedAt: string | null; // ISO string for serialization
}

export interface PagesData {
    statuses: PageStatus[];
    locations: LocationInfo[];
    locationsHeroTitle: string;
    locationsHeroDescription: string;
    zipSeoContent: ZipSeoPageContent | null;
}

const PAGE_TYPES: BrandPageType[] = ['menu', 'locations', 'zip_seo'];

/**
 * Fetch all page data for the Pages hub in a single call.
 * Eliminates N+1 — child tabs receive data as props instead of re-fetching.
 */
export async function getPagesData(orgId: string): Promise<PagesData> {
    const pages = await Promise.all(
        PAGE_TYPES.map((pageType) => getBrandPage(orgId, pageType))
    );

    const statuses: PageStatus[] = PAGE_TYPES.map((pageType, i) => ({
        pageType,
        isPublished: pages[i]?.isPublished ?? false,
        updatedAt: pages[i]?.updatedAt?.toDate?.()?.toISOString() ?? null,
    }));

    const locationsPage = pages[1]; // 'locations' is index 1
    const zipSeoPage = pages[2];    // 'zip_seo' is index 2

    return {
        statuses,
        locations: locationsPage?.locationsContent?.locations ?? [],
        locationsHeroTitle: locationsPage?.locationsContent?.heroTitle ?? '',
        locationsHeroDescription: locationsPage?.locationsContent?.heroDescription ?? '',
        zipSeoContent: zipSeoPage?.zipSeoContent ?? null,
    };
}

/**
 * Toggle publish status for a page type — thin wrapper for use from client
 */
export async function togglePagePublish(
    orgId: string,
    pageType: BrandPageType,
    isPublished: boolean
): Promise<PageStatus> {
    const updated = await toggleBrandPagePublish(orgId, pageType, isPublished);
    return {
        pageType,
        isPublished: updated.isPublished,
        updatedAt: updated.updatedAt?.toDate?.()?.toISOString() ?? null,
    };
}
