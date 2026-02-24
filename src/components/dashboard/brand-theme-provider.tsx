'use client';

/**
 * BrandThemeProvider
 *
 * Injects per-brand CSS custom properties into the dashboard so the UI
 * reflects the org's brand colors (--primary, --sidebar-primary, --ring).
 *
 * Only overrides the primary/accent hue — preserves dark-theme background
 * and foreground values so contrast stays readable.
 *
 * Usage: wrap dashboard layout content with this component.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { useUserRole } from '@/hooks/use-user-role';
import { getOrgBrandColors } from '@/server/actions/brand-guide';

// ---------------------------------------------------------------------------
// HEX → HSL conversion
// ---------------------------------------------------------------------------

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
    const clean = hex.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;

    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

/** Compute relative luminance to decide if foreground should be black or white */
function relativeLuminance(hex: string): number {
    const clean = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map(i => {
        const c = parseInt(clean.slice(i, i + 2), 16) / 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function fgForBg(hex: string): string {
    // WCAG contrast: use white text on dark backgrounds, dark on light
    return relativeLuminance(hex) > 0.35 ? '0 0% 5%' : '0 0% 100%';
}

// ---------------------------------------------------------------------------
// Build CSS variable overrides from brand colors
// ---------------------------------------------------------------------------

function buildCssVars(
    primary?: string,
    accent?: string,
): Record<string, string> | null {
    if (!primary) return null;

    const hsl = hexToHsl(primary);
    if (!hsl) return null;

    const { h, s, l } = hsl;
    const hslStr = `${h} ${s}% ${l}%`;
    const fg = fgForBg(primary);

    const vars: Record<string, string> = {
        '--primary': hslStr,
        '--primary-foreground': fg,
        '--sidebar-primary': hslStr,
        '--sidebar-primary-foreground': fg,
        '--ring': hslStr,
        '--sidebar-ring': hslStr,
    };

    if (accent) {
        const aHsl = hexToHsl(accent);
        if (aHsl) {
            const aStr = `${aHsl.h} ${aHsl.s}% ${aHsl.l}%`;
            vars['--accent'] = aStr;
            vars['--accent-foreground'] = fgForBg(accent);
        }
    }

    return vars;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BrandThemeProviderProps {
    children: ReactNode;
}

export function BrandThemeProvider({ children }: BrandThemeProviderProps) {
    const { orgId, isSuperUser } = useUserRole();
    const [cssVars, setCssVars] = useState<Record<string, string> | null>(null);

    useEffect(() => {
        // Super users see the default BakedBot theme (they manage all orgs)
        if (!orgId || isSuperUser) return;

        let cancelled = false;

        getOrgBrandColors(orgId).then(colors => {
            if (cancelled) return;
            const vars = buildCssVars(colors.primary, colors.accent);
            setCssVars(vars);
        }).catch(() => { /* non-fatal */ });

        return () => { cancelled = true; };
    }, [orgId, isSuperUser]);

    if (!cssVars) {
        return <>{children}</>;
    }

    return (
        <div style={cssVars as React.CSSProperties} className="contents">
            {children}
        </div>
    );
}
