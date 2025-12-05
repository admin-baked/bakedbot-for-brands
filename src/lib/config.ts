
/**
 * This file contains shared constants and configuration for the application.
 */

// The unique identifier used for the default/demo brand experience.
export const DEMO_BRAND_ID = 'default';

// CannMenus Configuration
// Fallback values provided to unblock functionality due to Cloud Run env var stripping issue
export const CANNMENUS_CONFIG = {
    API_KEY: process.env.CANNMENUS_API_KEY || 'e13ed642a92c177163ecff93c997d4ae',
    API_BASE: process.env.CANNMENUS_API_BASE || process.env.NEXT_PUBLIC_CANNMENUS_API_BASE || 'https://api.cannmenus.com',
};
