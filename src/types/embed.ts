
export interface BakedBotConfig {
    brandId?: string;
    cannMenusId?: string;
    customerName?: string;
    primaryColor?: string;
    greeting?: string;
    position?: 'bottom-right' | 'bottom-left';
    // Add any other properties needed for locator or other embeds
    type?: 'chatbot' | 'locator';
}

declare global {
    interface Window {
        BakedBotConfig?: BakedBotConfig;
    }
}
