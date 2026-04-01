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
            pageUrl: window.location.href,
            reporterEmail,
            userAgent: navigator.userAgent,
            errorDigest: error.digest,
            errorStack: error.stack,
        }),
    }).catch(() => { /* never throw from error boundaries */ });
}
