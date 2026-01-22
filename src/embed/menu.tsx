/**
 * Menu Embed Entry Point
 *
 * This script is loaded on external sites to create an iframe
 * containing the BakedBot menu experience.
 *
 * Usage:
 * <script>
 *   window.BakedBotConfig = {
 *     brandId: "your-brand-id",
 *     primaryColor: "#10b981",
 *     layout: "grid",
 *     showCart: true,
 *     showCategories: true,
 *     width: "100%",
 *     height: "600px"
 *   };
 * </script>
 * <script src="https://bakedbot.ai/embed/menu.js" async></script>
 *
 * Or use the iframe directly:
 * <iframe src="https://bakedbot.ai/embed/menu/your-brand-id" ...></iframe>
 */

import type { BakedBotConfig } from '@/types/embed';

declare global {
    interface Window {
        BakedBotConfig?: BakedBotConfig;
        BakedBotMenu?: {
            init: (config?: Partial<BakedBotConfig>) => void;
            destroy: () => void;
        };
    }
}

const BAKEDBOT_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://bakedbot.ai'
    : 'http://localhost:3000';

let menuIframe: HTMLIFrameElement | null = null;
let resizeListener: ((event: MessageEvent) => void) | null = null;

/**
 * Build the iframe URL with config params
 */
function buildIframeUrl(config: BakedBotConfig): string {
    const brandId = config.brandId;
    if (!brandId) {
        console.error('[BakedBot Menu] brandId is required');
        return '';
    }

    const params = new URLSearchParams();

    if (config.layout) params.set('layout', config.layout);
    if (config.showCart === false) params.set('showCart', 'false');
    if (config.showCategories === false) params.set('showCategories', 'false');
    if (config.primaryColor) params.set('primaryColor', config.primaryColor.replace('#', ''));

    const queryString = params.toString();
    return `${BAKEDBOT_BASE_URL}/embed/menu/${brandId}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Get container element
 */
function getContainer(): HTMLElement {
    // Look for a dedicated container first
    let container = document.getElementById('bakedbot-menu');

    if (!container) {
        // Create one if not found
        container = document.createElement('div');
        container.id = 'bakedbot-menu';
        document.body.appendChild(container);
    }

    return container;
}

/**
 * Initialize the menu embed
 */
function initBakedBotMenu(overrideConfig?: Partial<BakedBotConfig>): void {
    // Merge configs
    const config: BakedBotConfig = {
        ...window.BakedBotConfig,
        ...overrideConfig,
    };

    if (!config.brandId) {
        console.error('[BakedBot Menu] brandId is required in BakedBotConfig');
        return;
    }

    // Destroy existing iframe if any
    destroyBakedBotMenu();

    const container = getContainer();
    const iframeUrl = buildIframeUrl(config);

    if (!iframeUrl) return;

    // Create iframe
    menuIframe = document.createElement('iframe');
    menuIframe.src = iframeUrl;
    menuIframe.id = 'bakedbot-menu-iframe';
    menuIframe.title = 'BakedBot Menu';
    menuIframe.allow = 'payment';
    menuIframe.setAttribute('loading', 'lazy');

    // Styling
    menuIframe.style.cssText = `
        width: ${config.width || '100%'};
        height: ${config.height || '600px'};
        border: none;
        display: block;
        max-width: 100%;
    `;

    // Append to container
    container.appendChild(menuIframe);

    // Set up PostMessage listener for resize events
    resizeListener = (event: MessageEvent) => {
        // Validate origin
        if (!event.origin.includes('bakedbot.ai') && !event.origin.includes('localhost')) {
            return;
        }

        const data = event.data;
        if (data?.type === 'bakedbot:resize' && menuIframe) {
            menuIframe.style.height = `${data.payload.height}px`;
        }

        // Forward other events to window for parent site to handle
        if (data?.type?.startsWith('bakedbot:')) {
            window.dispatchEvent(new CustomEvent(data.type, { detail: data.payload }));
        }
    };

    window.addEventListener('message', resizeListener);

    console.log('[BakedBot Menu] Initialized', { brandId: config.brandId });
}

/**
 * Destroy the menu embed
 */
function destroyBakedBotMenu(): void {
    if (menuIframe) {
        menuIframe.remove();
        menuIframe = null;
    }

    if (resizeListener) {
        window.removeEventListener('message', resizeListener);
        resizeListener = null;
    }
}

// Export API
window.BakedBotMenu = {
    init: initBakedBotMenu,
    destroy: destroyBakedBotMenu,
};

// Auto-initialize if config is present
if (typeof window !== 'undefined' && window.BakedBotConfig?.brandId) {
    // Wait for DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initBakedBotMenu());
    } else {
        initBakedBotMenu();
    }
}
