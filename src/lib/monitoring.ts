// src/lib/monitoring.ts

/**
 * Centralized logging and monitoring utilities
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
    userId?: string;
    brandId?: string;
    requestId?: string;
    [key: string]: any;
}

class Logger {
    private context: LogContext = {};

    setContext(context: LogContext) {
        this.context = { ...this.context, ...context };
    }

    private log(level: LogLevel, message: string, data?: any) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...this.context,
            ...(data && { data }),
        };

        // Console logging
        const consoleMethod = level === 'error' ? console.error :
            level === 'warn' ? console.warn :
                console.log;

        consoleMethod(JSON.stringify(logEntry, null, 2));

        // In production, send to Google Cloud Logging
        if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
            this.sendToCloudLogging(logEntry);
        }

        // Send errors to client-side tracking
        if (typeof window !== 'undefined' && level === 'error') {
            this.trackClientError(message, data);
        }
    }

    private sendToCloudLogging(logEntry: any) {
        // TODO: Implement Google Cloud Logging integration
        // For now, just use console
    }

    private trackClientError(message: string, data?: any) {
        // Track in Google Analytics if available
        if ((window as any).gtag) {
            (window as any).gtag('event', 'exception', {
                description: message,
                fatal: false,
                ...data,
            });
        }

        // TODO: Add additional error tracking (Sentry, LogRocket, etc.)
    }

    debug(message: string, data?: any) {
        if (process.env.NODE_ENV === 'development') {
            this.log('debug', message, data);
        }
    }

    info(message: string, data?: any) {
        this.log('info', message, data);
    }

    warn(message: string, data?: any) {
        this.log('warn', message, data);
    }

    error(message: string, error?: Error | any) {
        this.log('error', message, {
            error: error?.message,
            stack: error?.stack,
            ...error,
        });
    }
}

// Singleton instance
export const logger = new Logger();

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
    private marks: Map<string, number> = new Map();

    start(label: string) {
        this.marks.set(label, performance.now());
    }

    end(label: string) {
        const startTime = this.marks.get(label);
        if (!startTime) {
            logger.warn(`Performance mark "${label}" not found`);
            return;
        }

        const duration = performance.now() - startTime;
        this.marks.delete(label);

        logger.info(`Performance: ${label}`, { duration: `${duration.toFixed(2)}ms` });

        // Track in analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'timing_complete', {
                name: label,
                value: Math.round(duration),
            });
        }

        return duration;
    }

    measure(label: string, fn: () => Promise<any>) {
        return async () => {
            this.start(label);
            try {
                const result = await fn();
                return result;
            } finally {
                this.end(label);
            }
        };
    }
}

export const perfMonitor = new PerformanceMonitor();

/**
 * Error reporting utility
 */
export function reportError(error: Error, context?: LogContext) {
    logger.setContext(context || {});
    logger.error('Unhandled error', error);

    // TODO: Send to error tracking service
    // Example: Sentry.captureException(error);
}

/**
 * API call monitoring wrapper
 */
export async function monitorApiCall<T>(
    endpoint: string,
    call: () => Promise<T>
): Promise<T> {
    const label = `API: ${endpoint}`;
    perfMonitor.start(label);

    try {
        const result = await call();
        perfMonitor.end(label);
        logger.debug(`API call successful: ${endpoint}`);
        return result;
    } catch (error: any) {
        perfMonitor.end(label);
        logger.error(`API call failed: ${endpoint}`, error);
        throw error;
    }
}

/**
 * Track user events
 */
export function trackEvent(
    eventName: string,
    properties?: Record<string, any>
) {
    logger.info(`Event: ${eventName}`, properties);

    if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', eventName, properties);
    }
}
