/**
 * Delivery QR Token Utilities
 *
 * Generates unique tokens for pickup and delivery QR check-ins.
 * Driver scans at dispensary (pickup) and at customer's door (delivery).
 */

import { randomUUID } from 'crypto';

/**
 * Generate a cryptographically unique QR token (UUID v4).
 */
export function generateQrToken(): string {
    return randomUUID();
}

/**
 * Build a QR code image URL using the free qrserver.com API.
 * No npm dependency required — returns a standard PNG image URL.
 */
export function buildQrImageUrl(token: string, size = 250): string {
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(token)}&size=${size}x${size}&format=png&margin=2`;
}

/**
 * Build the customer-facing QR display page URL.
 * Sent in the delivery en-route SMS so the customer can show the QR to the driver.
 */
export function buildCustomerQrPageUrl(deliveryId: string): string {
    return `https://bakedbot.ai/order-qr/${deliveryId}`;
}
