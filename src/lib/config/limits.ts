/**
 * Free Account Limits Configuration
 * Centralized limits for trial/free tier accounts
 */

export const FREE_ACCOUNT_LIMITS = {
    // Brand Limits
    brand: {
        products: 10,           // Max products for free brand accounts
        dispensaries: 3,        // Max dispensaries a brand can partner with
    },

    // Dispensary Limits  
    dispensary: {
        locations: 1,           // Max locations for free dispensary accounts
        products: 10,           // Max products per location
    },

    // Shared Limits
    shared: {
        apiCallsPerDay: 100,    // Rate limiting
        storageGB: 1,           // Storage quota
    }
} as const;

// Type exports for type safety
export type AccountLimits = typeof FREE_ACCOUNT_LIMITS;
export type BrandLimits = typeof FREE_ACCOUNT_LIMITS.brand;
export type DispensaryLimits = typeof FREE_ACCOUNT_LIMITS.dispensary;
