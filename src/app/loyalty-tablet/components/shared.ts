import { CSSProperties } from 'react';
import { PublicBrandTheme } from '@/lib/checkin/checkin-management-shared';
import { hexToRgba } from '@/lib/utils';

export const AMBER = '#f59e0b';
export const AMBER_DARK = '#d97706';
export const INPUT_CLASS = 'w-full border text-gray-900 placeholder-gray-400 text-lg sm:text-2xl py-4 sm:py-5 px-4 sm:px-6 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors';

export function createShellStyle(theme: PublicBrandTheme): CSSProperties {
    return {
        background: `linear-gradient(180deg, ${hexToRgba(theme.colors.primary, 0.06)} 0%, #ffffff 10%)`,
        color: '#111827',
    };
}

export function createPanelStyle(_theme: PublicBrandTheme, tone: 'default' | 'accent' = 'default'): CSSProperties {
    if (tone === 'accent') {
        return {
            background: `linear-gradient(135deg, ${hexToRgba(AMBER, 0.08)} 0%, ${hexToRgba(AMBER_DARK, 0.04)} 100%)`,
            borderColor: hexToRgba(AMBER, 0.3),
        };
    }
    return {
        background: '#ffffff',
        borderColor: '#e5e7eb',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    };
}

export function createPrimaryButtonStyle(_theme: PublicBrandTheme): CSSProperties {
    return {
        background: `linear-gradient(135deg, ${AMBER} 0%, ${AMBER_DARK} 100%)`,
        boxShadow: `0 8px 24px ${hexToRgba(AMBER, 0.28)}`,
        color: '#ffffff',
    };
}

export function createSecondaryButtonStyle(theme: PublicBrandTheme): CSSProperties {
    return {
        backgroundColor: hexToRgba(theme.colors.primary, 0.08),
        borderColor: hexToRgba(theme.colors.primary, 0.24),
        color: theme.colors.primary,
    };
}

export function createInputStyle(_theme: PublicBrandTheme): CSSProperties {
    return {
        borderColor: '#d1d5db',
        backgroundColor: '#ffffff',
    };
}

export const slideVariants = {
    enter: { x: 60, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -60, opacity: 0 },
};

export { hexToRgba } from '@/lib/utils';
export { SMOKEY_FALLBACK_IMAGE } from '@/lib/utils/product-image';
export const ASK_SMOKEY_PLACEHOLDER = 'Ask Smokey for something like calming gummies under $30 or a social pre-roll.';
