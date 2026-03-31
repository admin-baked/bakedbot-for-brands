/**
 * Shared auto-report helper: posts an unhandled error to /api/tickets so Linus is notified.
 * Used by GlobalError boundary and FelishaErrorBoundary (both auto-report on mount).
 */
interface AutoReportErrorTicketOptions {
    error: Error & { digest?: string };
    title: string;
    description: string;
    reporterEmail: string;
}

export function autoReportErrorTicket({ error, title, description, reporterEmail }: AutoReportErrorTicketOptions): void {
    void fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title,
            description,
            priority: 'high',
            category: 'system_error',
            pageUrl: typeof window !== 'undefined' ? window.location.href : 'unknown',
            reporterEmail,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
            errorDigest: error.digest,
            errorStack: error.stack,
        }),
    }).catch(() => { /* never throw from error boundaries */ });
}
