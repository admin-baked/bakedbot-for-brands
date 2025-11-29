/**
 * Performance Monitoring Utilities
 * Track key performance metrics
 */

import { logger } from '@/lib/logger';

'use client';

/**
 * Track page load performance
 */
export function trackPageLoad(pageName: string) {
    if (typeof window === 'undefined') return;

    // Use Performance API
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (perfData) {
        const metrics = {
            page: pageName,
            dns: perfData.domainLookupEnd - perfData.domainLookupStart,
            tcp: perfData.connectEnd - perfData.connectStart,
            ttfb: perfData.responseStart - perfData.requestStart,
            download: perfData.responseEnd - perfData.responseStart,
            domInteractive: perfData.domInteractive - perfData.fetchStart,
            domComplete: perfData.domComplete - perfData.fetchStart,
            loadComplete: perfData.loadEventEnd - perfData.fetchStart,
        };

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            logger.info('[Performance]', pageName, metrics);
        }

        // TODO: Send to analytics service
        // sendToAnalytics('page_performance', metrics);
    }
}

/**
 * Track Core Web Vitals
 */
export function trackWebVitals() {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        logger.info('[LCP]', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
            const fid = entry.processingStart - entry.startTime;
            logger.info('[FID]', fid);
        });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsScore = 0;
    new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
                clsScore += entry.value;
            }
        });
        logger.info('[CLS]', clsScore);
    }).observe({ entryTypes: ['layout-shift'] });
}

/**
 * Track custom metric
 */
export function trackMetric(name: string, value: number, unit: string = 'ms') {
    if (typeof window === 'undefined') return;

    performance.mark(name);

    if (process.env.NODE_ENV === 'development') {
        logger.info(`[Metric] ${name}: ${value}${unit}`);
    }

    // TODO: Send to monitoring service
}
