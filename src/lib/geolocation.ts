// src/lib/geolocation.ts
/**
 * Geolocation utilities for finding nearby dispensaries
 * Supports browser geolocation API and ZIP code fallback
 */

import { geocodeZipCode } from './cannmenus-api';

import { logger } from '@/lib/logger';
export type Coordinates = {
    latitude: number;
    longitude: number;
};

export type GeolocationResult = {
    coordinates: Coordinates;
    method: 'browser' | 'zipcode' | 'ip';
    accuracy?: number;
};

/**
 * Get user's location using browser geolocation API
 */
export async function getBrowserLocation(): Promise<GeolocationResult | null> {
    if (!navigator.geolocation) {
        logger.warn('Geolocation is not supported by this browser');
        return null;
    }

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    coordinates: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    },
                    method: 'browser',
                    accuracy: position.coords.accuracy,
                });
            },
            (error) => {
                logger.warn('Browser geolocation failed:', { message: error.message });
                resolve(null);
            },
            {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 300000, // 5 minutes
            }
        );
    });
}

/**
 * Get location from ZIP code
 */
export async function getLocationFromZipCode(zipCode: string): Promise<GeolocationResult | null> {
    const coords = await geocodeZipCode(zipCode);

    if (!coords) {
        return null;
    }

    return {
        coordinates: {
            latitude: coords.lat,
            longitude: coords.lng,
        },
        method: 'zipcode',
    };
}

/**
 * Get location from IP address (fallback method)
 */
export async function getIPLocation(): Promise<GeolocationResult | null> {
    try {
        // Using ipapi.co free service (100 requests/day)
        const response = await fetch('https://ipapi.co/json/');

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        if (data.latitude && data.longitude) {
            return {
                coordinates: {
                    latitude: data.latitude,
                    longitude: data.longitude,
                },
                method: 'ip',
            };
        }

        return null;
    } catch (error) {
        logger.error('IP geolocation failed:', error instanceof Error ? error : new Error(String(error)));
        return null;
    }
}

/**
 * Get user location with fallback chain:
 * 1. Try browser geolocation
 * 2. If denied/failed, prompt for ZIP code
 * 3. If no ZIP, try IP location
 */
export async function getUserLocation(): Promise<GeolocationResult | null> {
    // Try browser geolocation first
    const browserLocation = await getBrowserLocation();
    if (browserLocation) {
        return browserLocation;
    }

    // Fallback to IP location
    return await getIPLocation();
}

/**
 * Validate ZIP code format (US)
 */
export function isValidZipCode(zipCode: string): boolean {
    return /^\d{5}(-\d{4})?$/.test(zipCode);
}

/**
 * Save location to session storage for persistence
 */
export function saveLocation(location: GeolocationResult): void {
    try {
        sessionStorage.setItem('user_location', JSON.stringify(location));
    } catch (error) {
        logger.warn('Failed to save location to session storage:', error instanceof Error ? error : new Error(String(error)));
    }
}

/**
 * Get saved location from session storage
 */
export function getSavedLocation(): GeolocationResult | null {
    try {
        const saved = sessionStorage.getItem('user_location');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        logger.warn('Failed to retrieve saved location:', error instanceof Error ? error : new Error(String(error)));
    }
    return null;
}
