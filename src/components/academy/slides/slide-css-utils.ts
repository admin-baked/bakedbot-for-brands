/**
 * Slide CSS Utilities
 *
 * Shared styles for the premium slide deck visual system.
 * Glassmorphism cards, gradient text, color utilities.
 */

import type { CSSProperties } from 'react';

/** Glassmorphism card style — translucent with blur */
export const glassCard: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
};

/** Glassmorphism pill — smaller, rounded-full variant */
export const glassPill: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '9999px',
};

/** Gradient text fill using a hex color */
export function gradientText(color: string): CSSProperties {
  const lighter = lightenColor(color, 40);
  return {
    background: `linear-gradient(135deg, ${color}, ${lighter})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };
}

/** Convert hex color to rgba string */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Lighten a hex color by a percentage (0-100) */
export function lightenColor(hex: string, percent: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const factor = percent / 100;
  const nr = Math.min(255, Math.round(r + (255 - r) * factor));
  const ng = Math.min(255, Math.round(g + (255 - g) * factor));
  const nb = Math.min(255, Math.round(b + (255 - b) * factor));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

/** Glow shadow for colored elements */
export function glowShadow(color: string, spread = 20): CSSProperties {
  return {
    filter: `drop-shadow(0 0 ${spread}px ${hexToRgba(color, 0.4)})`,
  };
}
