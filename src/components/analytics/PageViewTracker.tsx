'use client';

import { useEffect, useRef } from 'react';
import { logPageView, logClick } from '@/server/actions/logPageView';

type PageType = 'brand' | 'dispensary' | 'zip' | 'product' | 'creative';

interface PageViewTrackerProps {
    pageType: PageType;
    pageId: string;
    pageSlug?: string;
    zipCode?: string;
    city?: string;
    state?: string;
}

/**
 * Client component that tracks page views on mount
 * Place this component in any page that needs analytics tracking
 */
export function PageViewTracker({
    pageType,
    pageId,
    pageSlug,
    zipCode,
    city,
    state
}: PageViewTrackerProps) {
    const hasTracked = useRef(false);

    useEffect(() => {
        // Only track once per page load
        if (hasTracked.current) return;
        hasTracked.current = true;

        // Get referrer from document
        const referrer = typeof document !== 'undefined' ? document.referrer : undefined;
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;

        // Fire and forget - don't block render
        logPageView({
            pageType,
            pageId,
            pageSlug,
            referrer,
            userAgent,
            zipCode,
            city,
            state
        }).catch(console.error);
    }, [pageType, pageId, pageSlug, zipCode, city, state]);

    // This component renders nothing
    return null;
}

interface TrackableButtonProps {
    pageType: PageType;
    pageId: string;
    clickType: 'cta' | 'directions' | 'phone' | 'website' | 'order' | 'claim';
    clickTarget?: string;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    href?: string;
    asChild?: boolean;
}

/**
 * Wrapper component that tracks clicks on any button or link
 */
export function TrackableButton({
    pageType,
    pageId,
    clickType,
    clickTarget,
    children,
    className,
    onClick,
    href
}: TrackableButtonProps) {
    const handleClick = () => {
        // Track the click (fire and forget)
        logClick({
            pageType,
            pageId,
            clickType,
            clickTarget
        }).catch(console.error);

        // Call original onClick if provided
        onClick?.();
    };

    if (href) {
        return (
            <a href={href} className={className} onClick={handleClick}>
                {children}
            </a>
        );
    }

    return (
        <button className={className} onClick={handleClick}>
            {children}
        </button>
    );
}

/**
 * Hook for tracking clicks programmatically
 */
export function useTrackClick(pageType: PageType, pageId: string) {
    return (clickType: 'cta' | 'directions' | 'phone' | 'website' | 'order' | 'claim', clickTarget?: string) => {
        logClick({
            pageType,
            pageId,
            clickType,
            clickTarget
        }).catch(console.error);
    };
}
