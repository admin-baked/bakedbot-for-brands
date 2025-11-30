/**
 * Production-grade structured logging using Google Cloud Logging
 * 
 * [AI-THREAD P0-MON-LOGGING]
 * [Dev2-Infra @ 2025-11-29]: GCP Logging wrapper for structured logs.
 * Uses @google-cloud/logging for production SERVER-SIDE, console for dev/client.
 * 
 * IMPORTANT: Uses dynamic imports to prevent webpack bundling GCP Logging for client.
 */

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

interface LogEntry {
    message: string;
    data?: Record<string, any>;
    level?: LogLevel;
}

// Lazy-loaded GCP logging instance (server-side only)
let gcpLogInitialized = false;
let gcpLog: any = null;

/**
 * Initialize GCP Logging dynamically (server-side only)
 */
async function initGCPLogging() {
    if (gcpLogInitialized) return gcpLog;

    // Only initialize on server in production
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
        try {
            // Dynamic import prevents webpack from bundling for client
            const { Logging } = await import('@google-cloud/logging');
            const logging = new Logging({
                projectId: process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8'
            });
            gcpLog = logging.log('bakedbot-app');
        } catch (error) {
            console.error('[Logger] Failed to initialize GCP Logging:', error);
            gcpLog = null;
        }
    }

    gcpLogInitialized = true;
    return gcpLog;
}

/**
 * Write structured log entry to Google Cloud Logging (production) or console (dev)
 * Also sends ERROR and CRITICAL logs to Sentry.
 */
async function writeLog({ message, data = {}, level = 'INFO' }: LogEntry) {
    const timestamp = new Date().toISOString();

    // Send to Sentry for ERROR/CRITICAL
    if (level === 'ERROR' || level === 'CRITICAL') {
        Sentry.captureException(new Error(message), {
            level: level === 'CRITICAL' ? 'fatal' : 'error',
            extra: data,
            tags: { logger: typeof window === 'undefined' ? 'server' : 'client' }
        });
    }

    // Server-side production logging to GCP
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
        const log = await initGCPLogging();
        if (log) {
            try {
                const entry = log.entry(
                    {
                        severity: level,
                        resource: { type: 'cloud_run_revision' }
                    },
                    {
                        message,
                        ...data,
                        timestamp,
                    }
                );

                // Fire and forget - don't await
                log.write(entry).catch((err: Error) => {
                    console.error('[Logger Error]', err);
                });
            } catch (error) {
                console.error('[Logger Error]', error);
            }
        } else {
            // Fallback to console if GCP logging failed to initialize
            console.log(`[${level}] ${timestamp} ${message}`, data);
        }
    } else {
        // Development or client-side: Console logging
        const prefix = `[${level}] ${timestamp} ${message}`;
        const logData = Object.keys(data).length > 0 ? data : undefined;

        switch (level) {
            case 'ERROR':
            case 'CRITICAL':
                console.error(prefix, logData || '');
                break;
            case 'WARNING':
                console.warn(prefix, logData || '');
                break;
            default:
                console.log(prefix, logData || '');
        }
    }
}

export const logger = {
    debug: (message: string, data?: Record<string, any>) =>
        writeLog({ message, data, level: 'DEBUG' }),

    info: (message: string, data?: Record<string, any>) =>
        writeLog({ message, data, level: 'INFO' }),

    warn: (message: string, data?: Record<string, any>) =>
        writeLog({ message, data, level: 'WARNING' }),

    error: (message: string, data?: Record<string, any>) =>
        writeLog({ message, data, level: 'ERROR' }),

    critical: (message: string, data?: Record<string, any>) =>
        writeLog({ message, data, level: 'CRITICAL' }),
};
