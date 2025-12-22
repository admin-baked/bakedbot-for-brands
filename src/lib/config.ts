
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

export const GOOGLE_MAPS_CONFIG = {
    API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyASUULiUcdtqVnPrTqZTsxoNiXdFPJ5e7E',
    MAP_ID: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || '8e0a97af9386fef', // Light Mode
};

export const GOOGLE_OAUTH_CONFIG = {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
    SCOPES: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email'
    ]
};
