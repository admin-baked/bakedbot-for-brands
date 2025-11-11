
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
 * Sets a cookie to persist the demo mode state.
 * @param on - Whether demo mode is enabled.
 */
export function setDemoCookie(on: boolean) {
  if (typeof document === 'undefined') return;
  const oneYear = 365 * 24 * 60 * 60;
  document.cookie = [
    `isUsingDemoData=${on ? "1" : "0"}`,
    "Max-Age=" + oneYear,
    "Path=/",
    "SameSite=Lax",
  ].join("; ");
}
