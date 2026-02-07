/**
 * Accessibility Checker - WCAG Contrast Ratio Compliance
 *
 * Validates color contrast ratios against WCAG 2.1 guidelines for
 * accessibility compliance (AA and AAA levels).
 *
 * Reference: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 */

import type { BrandColor } from '@/types/brand-guide';

// ============================================================================
// WCAG STANDARDS
// ============================================================================

export const WCAG_STANDARDS = {
  AA: {
    normalText: 4.5,
    largeText: 3.0,
    graphicalObjects: 3.0,
  },
  AAA: {
    normalText: 7.0,
    largeText: 4.5,
    graphicalObjects: 3.0,
  },
};

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Handle 3-digit hex
  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], 16),
      g: parseInt(cleanHex[1] + cleanHex[1], 16),
      b: parseInt(cleanHex[2] + cleanHex[2], 16),
    };
  }

  // Handle 6-digit hex
  if (cleanHex.length === 6) {
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    };
  }

  return null;
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculate relative luminance of a color
 * Formula: https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getLuminance(rgb: { r: number; g: number; b: number }): number {
  // Convert RGB to sRGB
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  // Apply gamma correction
  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  // Calculate luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 * Formula: https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 */
export function getContrastRatio(
  color1: string,
  color2: string
): number | null {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return null;

  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

// ============================================================================
// WCAG LEVEL CHECKS
// ============================================================================

export type WCAGLevel = 'AAA' | 'AA' | 'fail';
export type TextSize = 'normal' | 'large'; // Large text = 18pt+ or 14pt+ bold

export interface ContrastResult {
  ratio: number;
  level: WCAGLevel;
  passAA: boolean;
  passAAA: boolean;
  passAANormal: boolean;
  passAALarge: boolean;
  passAAANormal: boolean;
  passAAALarge: boolean;
  textReadable: boolean;      // Can use for normal text at AA level
}

/**
 * Check if contrast ratio meets WCAG level
 */
export function checkWCAGLevel(
  contrastRatio: number,
  textSize: TextSize = 'normal'
): ContrastResult {
  const passAANormal = contrastRatio >= WCAG_STANDARDS.AA.normalText;
  const passAALarge = contrastRatio >= WCAG_STANDARDS.AA.largeText;
  const passAAANormal = contrastRatio >= WCAG_STANDARDS.AAA.normalText;
  const passAAALarge = contrastRatio >= WCAG_STANDARDS.AAA.largeText;

  const passAA = textSize === 'normal' ? passAANormal : passAALarge;
  const passAAA = textSize === 'normal' ? passAAANormal : passAAALarge;

  let level: WCAGLevel = 'fail';
  if (passAAA) level = 'AAA';
  else if (passAA) level = 'AA';

  return {
    ratio: contrastRatio,
    level,
    passAA,
    passAAA,
    passAANormal,
    passAALarge,
    passAAANormal,
    passAAALarge,
    textReadable: passAANormal, // Strict check for normal text
  };
}

/**
 * Check color contrast against a background
 */
export function checkColorContrast(
  foreground: string,
  background: string,
  textSize: TextSize = 'normal'
): ContrastResult | null {
  const ratio = getContrastRatio(foreground, background);
  if (ratio === null) return null;
  return checkWCAGLevel(ratio, textSize);
}

/**
 * Check BrandColor accessibility
 */
export function checkBrandColorAccessibility(
  color: BrandColor,
  backgroundColor: string = '#FFFFFF'
): ContrastResult | null {
  return checkColorContrast(color.hex, backgroundColor);
}

// ============================================================================
// COLOR SUGGESTIONS
// ============================================================================

/**
 * Suggest accessible color adjustments
 */
export function suggestAccessibleColor(
  color: string,
  background: string,
  targetLevel: 'AA' | 'AAA' = 'AA',
  textSize: TextSize = 'normal'
): {
  original: string;
  suggested: string;
  contrastRatio: number;
  passes: boolean;
} | null {
  const rgb = hexToRgb(color);
  const bgRgb = hexToRgb(background);

  if (!rgb || !bgRgb) return null;

  const targetRatio =
    targetLevel === 'AAA'
      ? textSize === 'normal'
        ? WCAG_STANDARDS.AAA.normalText
        : WCAG_STANDARDS.AAA.largeText
      : textSize === 'normal'
      ? WCAG_STANDARDS.AA.normalText
      : WCAG_STANDARDS.AA.largeText;

  // Check if already passes
  const currentRatio = getContrastRatio(color, background);
  if (currentRatio && currentRatio >= targetRatio) {
    return {
      original: color,
      suggested: color,
      contrastRatio: currentRatio,
      passes: true,
    };
  }

  // Try darkening or lightening
  const bgLuminance = getLuminance(bgRgb);
  const darken = bgLuminance > 0.5; // Darken if background is light

  let suggested = { ...rgb };
  let bestRatio = 0;
  let bestColor = color;

  for (let adjustment = 0; adjustment <= 255; adjustment += 5) {
    if (darken) {
      suggested.r = Math.max(0, rgb.r - adjustment);
      suggested.g = Math.max(0, rgb.g - adjustment);
      suggested.b = Math.max(0, rgb.b - adjustment);
    } else {
      suggested.r = Math.min(255, rgb.r + adjustment);
      suggested.g = Math.min(255, rgb.g + adjustment);
      suggested.b = Math.min(255, rgb.b + adjustment);
    }

    const suggestedHex = rgbToHex(suggested.r, suggested.g, suggested.b);
    const ratio = getContrastRatio(suggestedHex, background);

    if (ratio && ratio > bestRatio) {
      bestRatio = ratio;
      bestColor = suggestedHex;
    }

    if (ratio && ratio >= targetRatio) {
      return {
        original: color,
        suggested: suggestedHex,
        contrastRatio: ratio,
        passes: true,
      };
    }
  }

  // Return best attempt even if doesn't pass
  return {
    original: color,
    suggested: bestColor,
    contrastRatio: bestRatio,
    passes: bestRatio >= targetRatio,
  };
}

/**
 * Generate accessible color palette from a base color
 */
export function generateAccessiblePalette(
  baseColor: string,
  background: string = '#FFFFFF'
): {
  base: string;
  light: string;
  lighter: string;
  dark: string;
  darker: string;
  accessible: {
    normalText: string;
    largeText: string;
  };
} | null {
  const rgb = hexToRgb(baseColor);
  if (!rgb) return null;

  // Generate variations
  const light = rgbToHex(
    Math.min(255, rgb.r + 40),
    Math.min(255, rgb.g + 40),
    Math.min(255, rgb.b + 40)
  );

  const lighter = rgbToHex(
    Math.min(255, rgb.r + 80),
    Math.min(255, rgb.g + 80),
    Math.min(255, rgb.b + 80)
  );

  const dark = rgbToHex(
    Math.max(0, rgb.r - 40),
    Math.max(0, rgb.g - 40),
    Math.max(0, rgb.b - 40)
  );

  const darker = rgbToHex(
    Math.max(0, rgb.r - 80),
    Math.max(0, rgb.g - 80),
    Math.max(0, rgb.b - 80)
  );

  // Get accessible versions
  const normalTextAccessible = suggestAccessibleColor(
    baseColor,
    background,
    'AA',
    'normal'
  );

  const largeTextAccessible = suggestAccessibleColor(
    baseColor,
    background,
    'AA',
    'large'
  );

  return {
    base: baseColor,
    light,
    lighter,
    dark,
    darker,
    accessible: {
      normalText: normalTextAccessible?.suggested || darker,
      largeText: largeTextAccessible?.suggested || dark,
    },
  };
}

// ============================================================================
// BRAND PALETTE VALIDATION
// ============================================================================

export interface PaletteValidationResult {
  isAccessible: boolean;
  totalColors: number;
  passedColors: number;
  failedColors: number;
  issues: Array<{
    colorName: string;
    colorHex: string;
    issue: string;
    severity: 'critical' | 'warning';
    suggestion?: string;
  }>;
  recommendations: string[];
}

/**
 * Validate entire brand color palette for accessibility
 */
export function validateBrandPalette(
  colors: {
    primary: BrandColor;
    secondary: BrandColor;
    accent: BrandColor;
    text: BrandColor;
    background: BrandColor;
  },
  strictMode: boolean = false // AAA instead of AA
): PaletteValidationResult {
  const issues: PaletteValidationResult['issues'] = [];
  const recommendations: string[] = [];
  let passedColors = 0;
  let failedColors = 0;

  const targetLevel: WCAGLevel = strictMode ? 'AAA' : 'AA';

  // Check text on background
  const textOnBg = checkColorContrast(colors.text.hex, colors.background.hex);
  if (textOnBg) {
    if (textOnBg.level === 'fail' || (strictMode && textOnBg.level !== 'AAA')) {
      failedColors++;
      issues.push({
        colorName: 'Text on Background',
        colorHex: colors.text.hex,
        issue: `Contrast ratio ${textOnBg.ratio.toFixed(2)}:1 does not meet ${targetLevel} (need ${strictMode ? '7.0' : '4.5'}:1)`,
        severity: 'critical',
        suggestion: `Adjust text color to improve readability`,
      });
    } else {
      passedColors++;
    }
  }

  // Check primary on background
  const primaryOnBg = checkColorContrast(colors.primary.hex, colors.background.hex);
  if (primaryOnBg) {
    if (!primaryOnBg.passAA) {
      failedColors++;
      issues.push({
        colorName: 'Primary on Background',
        colorHex: colors.primary.hex,
        issue: `Contrast ratio ${primaryOnBg.ratio.toFixed(2)}:1 - use for large text or graphics only`,
        severity: 'warning',
        suggestion: `Reserve primary color for large elements, not body text`,
      });
    } else {
      passedColors++;
    }
  }

  // Check secondary on background
  const secondaryOnBg = checkColorContrast(colors.secondary.hex, colors.background.hex);
  if (secondaryOnBg) {
    if (!secondaryOnBg.passAA) {
      failedColors++;
      issues.push({
        colorName: 'Secondary on Background',
        colorHex: colors.secondary.hex,
        issue: `Contrast ratio ${secondaryOnBg.ratio.toFixed(2)}:1 - may not be readable`,
        severity: 'warning',
      });
    } else {
      passedColors++;
    }
  }

  // Check accent on background
  const accentOnBg = checkColorContrast(colors.accent.hex, colors.background.hex);
  if (accentOnBg) {
    if (!accentOnBg.passAALarge) {
      failedColors++;
      issues.push({
        colorName: 'Accent on Background',
        colorHex: colors.accent.hex,
        issue: `Contrast ratio ${accentOnBg.ratio.toFixed(2)}:1 - use sparingly`,
        severity: 'warning',
      });
    } else {
      passedColors++;
    }
  }

  // Generate recommendations
  if (issues.length === 0) {
    recommendations.push('✅ Color palette meets all accessibility standards!');
  } else {
    const criticalIssues = issues.filter((i) => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(
        `⚠️ ${criticalIssues.length} critical accessibility issue(s) found. These must be addressed.`
      );
    }

    const warningIssues = issues.filter((i) => i.severity === 'warning');
    if (warningIssues.length > 0) {
      recommendations.push(
        `⚠️ ${warningIssues.length} color(s) have limited use cases for accessibility.`
      );
    }

    recommendations.push(
      'Consider using a color contrast checker tool during design phase.'
    );

    if (strictMode) {
      recommendations.push(
        'AAA compliance mode active - highest accessibility standard.'
      );
    }
  }

  return {
    isAccessible: issues.filter((i) => i.severity === 'critical').length === 0,
    totalColors: passedColors + failedColors,
    passedColors,
    failedColors,
    issues,
    recommendations,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get color brightness (0-255)
 */
export function getColorBrightness(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
}

/**
 * Determine if color is light or dark
 */
export function isLightColor(hex: string): boolean | null {
  const brightness = getColorBrightness(hex);
  if (brightness === null) return null;
  return brightness > 127.5;
}

/**
 * Get recommended text color (black or white) for background
 */
export function getRecommendedTextColor(background: string): '#000000' | '#FFFFFF' | null {
  const isLight = isLightColor(background);
  if (isLight === null) return null;
  return isLight ? '#000000' : '#FFFFFF';
}
