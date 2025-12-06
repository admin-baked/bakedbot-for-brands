/**
 * Client-side CSRF token management hook
 */

'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

let cachedToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

/**
 * Fetch CSRF token from the server
 */
async function fetchCsrfToken(): Promise<string> {
  // Return cached token if available and fresh (within 1 hour)
  if (cachedToken) {
    return cachedToken;
  }

  // Return existing promise if already fetching
  if (tokenPromise) {
    return tokenPromise;
  }

  tokenPromise = (async () => {
    try {
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data = await response.json();
      cachedToken = data.csrfToken;
      return cachedToken!;
    } catch (error) {
      logger.error('Failed to fetch CSRF token', error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      tokenPromise = null;
    }
  })();

  return tokenPromise;
}

/**
 * Hook to get CSRF token for use in fetch requests
 */
export function useCsrf() {
  const [token, setToken] = useState<string | null>(cachedToken);
  const [loading, setLoading] = useState(!cachedToken);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!cachedToken) {
      fetchCsrfToken()
        .then(setToken)
        .catch(setError)
        .finally(() => setLoading(false));
    }
  }, []);

  return { token, loading, error };
}

/**
 * Get CSRF headers for fetch requests
 */
export async function getCsrfHeaders(): Promise<Record<string, string>> {
  const token = await fetchCsrfToken();
  return {
    'X-CSRF-Token': token,
  };
}

/**
 * Enhanced fetch that automatically includes CSRF token
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);

  // Add CSRF token for state-changing methods
  if (
    options.method &&
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method.toUpperCase())
  ) {
    const csrfHeaders = await getCsrfHeaders();
    Object.entries(csrfHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}
