/**
 * CORS configuration and utilities
 */

/**
 * Allowed origins for CORS requests.
 * In production, only allow specific domains.
 * In development, allow localhost on any port.
 */
export const ALLOWED_ORIGINS = [
  'https://bakedbot.ai',
  'https://www.bakedbot.ai',
  'https://app.bakedbot.ai',
  'https://studio-567050101-bc6e8.web.app',
  'https://studio-567050101-bc6e8.firebaseapp.com',
  // Development
  ...(process.env.NODE_ENV === 'development'
    ? [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3002',
      ]
    : []),
];

/**
 * Check if an origin is allowed for CORS requests
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  // Exact match
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // In development, allow any localhost port
  if (process.env.NODE_ENV === 'development') {
    try {
      const url = new URL(origin);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Get CORS headers for a response based on the request origin
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {};

  if (isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin!;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * CORS preflight response headers
 */
export const CORS_PREFLIGHT_HEADERS = {
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':
    'X-Requested-With, Content-Type, Authorization, X-Firebase-AppCheck',
  'Access-Control-Max-Age': '86400',
};
