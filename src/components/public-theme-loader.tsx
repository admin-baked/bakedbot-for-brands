'use client';

/**
 * Public Theme Loader Component
 *
 * Loads and injects WordPress theme CSS on public pages
 * Works for:
 * - Brand info pages (no products)
 * - Menu pages (with products)
 * - Dispensary pages (mixed content)
 *
 * Usage: <PublicThemeLoader orgId="org_123" /> with rest of page content
 */

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

interface PublicThemeLoaderProps {
  orgId: string;
  themeId?: string;
}

export function PublicThemeLoader({ orgId, themeId }: PublicThemeLoaderProps) {
  useEffect(() => {
    if (!orgId || !themeId) {
      return;
    }

    // Load theme CSS dynamically
    const loadThemeCss = async () => {
      try {
        const cssUrl = `/api/themes/css?themeId=${encodeURIComponent(themeId)}&orgId=${encodeURIComponent(orgId)}`;

        // Check if CSS already loaded
        const styleId = `bakedbot-theme-css-${themeId}`;
        if (document.getElementById(styleId)) {
          return;
        }

        // Fetch CSS
        const response = await fetch(cssUrl);
        if (!response.ok) {
          logger.warn('[PublicThemeLoader] Failed to load theme CSS', {
            status: response.status,
            themeId,
            orgId,
          });
          return;
        }

        const css = await response.text();

        // Create and inject style tag
        const styleTag = document.createElement('style');
        styleTag.id = styleId;
        styleTag.textContent = css;

        // Insert after existing styles but before user preferences
        const headStyles = document.querySelectorAll('style, link[rel="stylesheet"]');
        const lastStyle = headStyles[headStyles.length - 1];

        if (lastStyle) {
          lastStyle.insertAdjacentElement('afterend', styleTag);
        } else {
          document.head.appendChild(styleTag);
        }

        logger.info('[PublicThemeLoader] Theme CSS loaded', {
          themeId,
          orgId,
          cssSize: css.length,
        });
      } catch (error) {
        logger.error('[PublicThemeLoader] Error loading theme CSS', {
          error,
          themeId,
          orgId,
        });
      }
    };

    loadThemeCss();
  }, [themeId, orgId]);

  // Invisible component - only for side effects
  return null;
}
