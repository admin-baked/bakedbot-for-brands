
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a random ID.
 * Uses crypto.randomUUID if available, otherwise falls back to Math.random.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Calculates the Haversine distance between two points on the Earth.
 * @param coords1 - The coordinates of the first point { lat, lon }.
 * @param coords2 - The coordinates of the second point { lat, lon }.
 * @returns The distance in miles.
 */
export function haversineDistance(
  coords1: { lat: number; lon: number },
  coords2: { lat: number; lon: number }
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 3958.8; // Earth's radius in miles

  const dLat = toRad(coords2.lat - coords1.lat);
  const dLon = toRad(coords2.lon - coords1.lon);
  const lat1 = toRad(coords1.lat);
  const lat2 = toRad(coords2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}


/**
 * Formats a number into a compact, readable string (e.g., 1200 -> 1.2k).
 * @param num - The number to format.
 * @returns A formatted string.
 */
export function formatNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
}

/**
 * Formats a number as currency (USD).
 * @param value - The number to format.
 * @returns A formatted currency string (e.g., "$12.50").
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

/**
 * Recursively removes undefined values from plain objects and arrays.
 * Firestore rejects undefined values, so server write payloads should be
 * normalized through this helper before persistence.
 */
export function omitUndefinedDeep<T>(value: T): T {
    if (Array.isArray(value)) {
        return value
            .map((entry) => omitUndefinedDeep(entry))
            .filter((entry) => entry !== undefined) as T;
    }

    if (isPlainObject(value)) {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([, entry]) => entry !== undefined)
                .map(([key, entry]) => [key, omitUndefinedDeep(entry)])
                .filter(([, entry]) => entry !== undefined),
        ) as T;
    }

    return value;
}

/**
 * Strips protocol, www prefix, and trailing slash from a URL for display.
 * Returns null if no URL is provided.
 */
export function formatWebsiteLabel(websiteUrl?: string): string | null {
    if (!websiteUrl) return null;
    return websiteUrl
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/\/$/, '');
}

/**
 * Converts a hex color string to an RGBA string with the given alpha.
 * Supports both 3-digit and 6-digit hex codes.
 */
export function hexToRgba(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '');
    const safe = normalized.length === 3
        ? normalized.split('').map((char) => char + char).join('')
        : normalized.padEnd(6, '0').slice(0, 6);

    const r = parseInt(safe.slice(0, 2), 16);
    const g = parseInt(safe.slice(2, 4), 16);
    const b = parseInt(safe.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
