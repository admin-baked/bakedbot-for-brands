/**
 * Currency Formatting Utilities
 * Supports multiple currencies (USD, THB, VND, etc.)
 */

/**
 * Format an amount as a currency string
 * @param amount - Numeric amount
 * @param currency - Currency code (USD, THB, VND, etc.)
 * @returns Formatted currency string
 *
 * Examples:
 * formatCurrency(12.99, 'USD') → "$12.99"
 * formatCurrency(350, 'THB') → "฿350"
 * formatCurrency(500000, 'VND') → "₫500,000"
 */
export function formatCurrency(amount: number, currency: string): string {
    const upperCurrency = currency.toUpperCase();

    switch (upperCurrency) {
        case 'THB':
            // Thai Baht: ฿ symbol, no decimals for whole numbers
            return `฿${Math.round(amount).toLocaleString()}`;

        case 'VND':
            // Vietnamese Dong: ₫ symbol, no decimals
            return `₫${Math.round(amount).toLocaleString()}`;

        case 'KHR':
            // Cambodian Riel: ៛ symbol, no decimals
            return `៛${Math.round(amount).toLocaleString()}`;

        case 'USD':
        default:
            // US Dollar: $ symbol, 2 decimals
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            }).format(amount);
    }
}

/**
 * Get the currency symbol for a given currency code
 * @param currency - Currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency: string): string {
    const upperCurrency = currency.toUpperCase();

    const symbols: Record<string, string> = {
        THB: '฿',
        VND: '₫',
        KHR: '៛',
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥',
        CNY: '¥',
        INR: '₹',
    };

    return symbols[upperCurrency] || currency;
}

/**
 * Convert between currencies (requires exchange rates)
 * @param amount - Amount in source currency
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param exchangeRate - Exchange rate (fromCurrency to toCurrency)
 * @returns Converted amount
 *
 * Example:
 * convertCurrency(100, 'USD', 'THB', 35) → 3500
 */
export function convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    exchangeRate: number
): number {
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
        return amount;
    }
    return Math.round(amount * exchangeRate * 100) / 100;
}
