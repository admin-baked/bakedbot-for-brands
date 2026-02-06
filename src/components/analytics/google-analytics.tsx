'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

const GA_MEASUREMENT_ID = 'G-B4FT9QTWD1';

function GoogleAnalyticsContent() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (pathname && window.gtag) {
            window.gtag('config', GA_MEASUREMENT_ID, {
                page_path: pathname,
            });
        }
    }, [pathname, searchParams]);

    return (
        <>
            <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <Script
                id="google-analytics"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${GA_MEASUREMENT_ID}', {
                        page_path: window.location.pathname,
                    });
                    `,
                }}
            />
        </>
    );
}

export function GoogleAnalytics() {
    return (
        <Suspense fallback={null}>
            <GoogleAnalyticsContent />
        </Suspense>
    );
}

// Add type definition for global gtag
declare global {
    interface Window {
        gtag?: (...args: any[]) => void;
        dataLayer?: any[];
    }
}
