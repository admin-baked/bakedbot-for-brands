export const logger = {
    debug: (msg: string, data?: any) => console.debug('[Embed]', msg, data),
    info: (msg: string, data?: any) => console.info('[Embed]', msg, data),
    warn: (msg: string, data?: any) => console.warn('[Embed]', msg, data),
    error: (msg: string, data?: any) => console.error('[Embed]', msg, data),
    critical: (msg: string, data?: any) => console.error('[Embed] CRITICAL:', msg, data),
};
