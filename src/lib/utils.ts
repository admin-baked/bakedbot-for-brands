
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
