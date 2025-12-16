'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Accept.js types (loaded dynamically from Authorize.Net)
interface AcceptJsAPI {
    dispatchData: (
        secureData: AcceptSecureData,
        responseHandler: (response: AcceptResponse) => void
    ) => void;
}

// Get Accept from window (dynamically loaded script)
function getAccept(): AcceptJsAPI | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).Accept;
}

interface AcceptSecureData {
    authData: {
        clientKey: string;
        apiLoginID: string;
    };
    cardData: {
        cardNumber: string;
        month: string;
        year: string;
        cardCode: string;
    };
}

interface AcceptResponse {
    opaqueData?: {
        dataDescriptor: string;
        dataValue: string;
    };
    messages: {
        resultCode: 'Ok' | 'Error';
        message: Array<{ code: string; text: string }>;
    };
}

export interface OpaqueData {
    dataDescriptor: string;
    dataValue: string;
}

interface UseAcceptJsOptions {
    clientKey: string;
    apiLoginId: string;
}

/**
 * Hook for integrating Authorize.Net Accept.js
 * Tokenizes card data client-side for PCI compliance
 */
export function useAcceptJs({ clientKey, apiLoginId }: UseAcceptJsOptions) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scriptLoaded = useRef(false);

    // Load Accept.js script
    useEffect(() => {
        if (scriptLoaded.current || typeof window === 'undefined') return;

        const isProduction = process.env.NEXT_PUBLIC_AUTHNET_ENV === 'production';
        const scriptSrc = isProduction
            ? 'https://js.authorize.net/v1/Accept.js'
            : 'https://jstest.authorize.net/v1/Accept.js';

        // Check if already loaded
        const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);
        if (existingScript) {
            setIsLoaded(true);
            scriptLoaded.current = true;
            return;
        }

        const script = document.createElement('script');
        script.src = scriptSrc;
        script.async = true;
        script.onload = () => {
            setIsLoaded(true);
            scriptLoaded.current = true;
        };
        script.onerror = () => {
            setError('Failed to load payment processor');
        };

        document.head.appendChild(script);

        return () => {
            // Don't remove the script on unmount, it may be needed by other components
        };
    }, []);

    /**
     * Tokenize card data and return opaque data for server-side processing
     */
    const tokenizeCard = useCallback(async (cardData: {
        cardNumber: string;
        expirationMonth: string;
        expirationYear: string;
        cvv: string;
    }): Promise<OpaqueData> => {
        return new Promise((resolve, reject) => {
            const accept = getAccept();
            if (!accept) {
                reject(new Error('Accept.js not loaded'));
                return;
            }

            setIsLoading(true);
            setError(null);

            const secureData: AcceptSecureData = {
                authData: {
                    clientKey,
                    apiLoginID: apiLoginId
                },
                cardData: {
                    cardNumber: cardData.cardNumber.replace(/\s/g, ''),
                    month: cardData.expirationMonth.padStart(2, '0'),
                    year: cardData.expirationYear.length === 2
                        ? `20${cardData.expirationYear}`
                        : cardData.expirationYear,
                    cardCode: cardData.cvv
                }
            };

            accept.dispatchData(secureData, (response: AcceptResponse) => {
                setIsLoading(false);

                if (response.messages.resultCode === 'Error') {
                    const errorMessage = response.messages.message[0]?.text || 'Card validation failed';
                    setError(errorMessage);
                    reject(new Error(errorMessage));
                    return;
                }

                if (response.opaqueData) {
                    resolve(response.opaqueData);
                } else {
                    reject(new Error('No payment token received'));
                }
            });
        });
    }, [clientKey, apiLoginId]);

    return {
        isLoaded,
        isLoading,
        error,
        tokenizeCard
    };
}

/**
 * Parse expiration date from MM/YY or MM/YYYY format
 */
export function parseExpirationDate(expiry: string): { month: string; year: string } | null {
    const parts = expiry.replace(/\s/g, '').split('/');
    if (parts.length !== 2) return null;

    const month = parts[0];
    let year = parts[1];

    // Validate month
    const monthNum = parseInt(month, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return null;

    // Handle 2-digit or 4-digit year
    if (year.length === 2) {
        year = `20${year}`;
    }

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 2024) return null;

    return { month, year };
}

/**
 * Format card number with spaces for display
 */
export function formatCardNumber(value: string): string {
    const digits = value.replace(/\D/g, '');
    const groups = digits.match(/.{1,4}/g) || [];
    return groups.join(' ').substr(0, 19); // Max 16 digits + 3 spaces
}

/**
 * Format expiration date as MM/YY
 */
export function formatExpiryDate(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 2) {
        return `${digits.substr(0, 2)}/${digits.substr(2, 2)}`;
    }
    return digits;
}
