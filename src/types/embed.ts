
export interface BakedBotConfig {
    brandId?: string;
    cannMenusId?: string;
    customerName?: string;
    primaryColor?: string;
    greeting?: string;
    position?: 'bottom-right' | 'bottom-left';
    type?: 'chatbot' | 'locator' | 'menu';

    // Menu embed specific options
    /** Layout style for product grid */
    layout?: 'grid' | 'list' | 'compact';
    /** Width of the embed (CSS value) */
    width?: string;
    /** Height of the embed (CSS value) */
    height?: string;
    /** Show/hide shopping cart */
    showCart?: boolean;
    /** Show/hide category navigation */
    showCategories?: boolean;
}

declare global {
    interface Window {
        BakedBotConfig?: BakedBotConfig;
    }
}
