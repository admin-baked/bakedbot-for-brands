import { MetadataRoute } from 'next';

/**
 * PWA Manifest for Driver App
 *
 * Allows drivers to "Add to Home Screen" on mobile devices
 * Makes the driver app feel like a native app
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'BakedBot Driver',
        short_name: 'Driver App',
        description: 'Cannabis delivery driver app — NY OCM compliant',
        start_url: '/driver/dashboard',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#7c3aed',
        orientation: 'portrait',
        icons: [
            {
                src: '/icons/driver-icon-192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icons/driver-icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            },
            {
                src: '/icons/driver-icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    };
}
