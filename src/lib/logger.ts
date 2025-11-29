/**
 * Production-grade structured logging using Google Cloud Logging
 * 
 * [AI-THREAD P0-MON-LOGGING]
 * [Dev2-Infra @ 2025-11-29]: GCP Logging wrapper for structured logs.
 * Uses @google-cloud/logging for production, console for dev.
 */

import { Logging } from '@google-cloud/logging';

// Initialize Google Cloud Logging (uses Application Default Credentials in production)
const logging = typeof window === 'undefined' && process.env.NODE_ENV === 'production'
    ? new Logging({ projectId: process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8' })
    : null;

const log = logging?.log('bakedbot-app');

type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

interface LogEntry {
    message: string;
    data?: Record<string, any>;
    level?: LogLevel;
}

/**
 * Write structured log entry to Google Cloud Logging (production) or console (dev)
 */
function writeLog({ message, data = {}, level = 'INFO' }: LogEntry) {
    const timestamp = new Date().toISOString();

    if (process.env.NODE_ENV === 'production' && log) {
        // Production: Send to Google Cloud Logging
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

        log.write(entry).catch((err) => {
            console.error('[Logger Error]', err);
        });
    } else {
        // Development: Console with level prefix
        const prefix = `[${level}] ${timestamp}`;
        const logData = Object.keys(data).length > 0 ? data : undefined;

        switch (level) {
            case 'ERROR':
            case 'CRITICAL':
                console.error(prefix, message, logData);
                break;
            case 'WARNING':
                console.warn(prefix, message, logData);
                break;
            default:
                console.log(prefix, message, logData);
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
