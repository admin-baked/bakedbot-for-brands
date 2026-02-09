/**
 * Vibe Generator Service
 *
 * AI-powered theme generation using Claude.
 * Converts natural language descriptions into complete vibe configurations.
 */

import { callClaude } from '@/ai/claude';
import { logger } from '@/lib/logger';
import type {
    VibeConfig,
    VibeGenerationRequest,
    VibeGenerationResponse,
    ColorPalette,
    TypographyConfig,
    ComponentConfig,
    AnimationConfig,
    SpecialEffects,
    VIBE_PRESETS,
} from '@/types/vibe';

// ============================================
// GENERATION PROMPT
// ============================================

const SYSTEM_PROMPT = `You are a world-class UI/UX designer specializing in cannabis dispensary and brand websites.
You create stunning, conversion-optimized themes based on natural language descriptions.

When generating a vibe configuration, consider:
1. Color psychology and brand identity
2. Cannabis industry aesthetics (professional yet inviting)
3. Accessibility and readability
4. Mobile-first responsive design
5. Conversion optimization for e-commerce

Return ONLY valid JSON matching the schema. No explanations or markdown.`;

const generatePrompt = (request: VibeGenerationRequest): string => {
    const refinementContext = request.currentConfig
        ? `\n\nCurrent configuration to refine:\n${JSON.stringify(request.currentConfig, null, 2)}`
        : '';

    const styleGuidance = request.style === 'creative'
        ? 'Be bold and experimental with colors, fonts, and effects.'
        : request.style === 'conservative'
            ? 'Keep it professional and subtle. Avoid flashy effects.'
            : 'Balance creativity with professionalism.';

    return `Generate a complete vibe configuration for a cannabis menu/website based on this description:

"${request.prompt}"

Style guidance: ${styleGuidance}
${refinementContext}

Return a JSON object with this exact structure:
{
  "name": "Creative name for this vibe (2-4 words)",
  "description": "One sentence describing the aesthetic",
  "reasoning": "Brief explanation of your design choices",
  "suggestions": ["Alternative idea 1", "Alternative idea 2", "Alternative idea 3"],
  "theme": {
    "colors": {
      "primary": "#hex",
      "secondary": "#hex",
      "accent": "#hex",
      "background": "#hex",
      "surface": "#hex",
      "text": "#hex",
      "textMuted": "#hex",
      "border": "#hex",
      "success": "#hex",
      "warning": "#hex",
      "error": "#hex"
    },
    "typography": {
      "headingFont": "Google Font name",
      "bodyFont": "Google Font name",
      "headingWeight": 400-900,
      "bodyWeight": 300-600,
      "baseSize": 14-18,
      "lineHeight": 1.4-1.8,
      "letterSpacing": -0.02 to 0.05
    },
    "spacing": {
      "unit": 4 or 8,
      "compact": boolean
    },
    "radius": {
      "none": "0",
      "sm": "Xpx",
      "md": "Xpx",
      "lg": "Xpx",
      "xl": "Xpx",
      "full": "9999px",
      "default": "none" | "sm" | "md" | "lg" | "xl" | "full"
    },
    "shadows": {
      "style": "none" | "subtle" | "medium" | "dramatic" | "neon",
      "color": "#hex (only for neon)"
    }
  },
  "components": {
    "hero": "video-bg" | "carousel" | "static" | "parallax" | "gradient-wave" | "split" | "minimal" | "full-bleed",
    "productCard": "minimal" | "detailed" | "hover-expand" | "neon-glow" | "polaroid" | "glass" | "brutalist" | "magazine",
    "navigation": "sticky-top" | "sidebar" | "floating-pills" | "hamburger-only" | "transparent" | "bottom-bar",
    "categoryGrid": "icons" | "images" | "text-only" | "animated-tiles" | "carousel" | "masonry",
    "chatbot": "bubble" | "sidebar" | "robot" | "custom-mascot" | "minimal" | "hidden",
    "footer": "minimal" | "full" | "wave" | "none"
  },
  "animations": {
    "pageTransition": "fade" | "slide" | "zoom" | "none",
    "scrollEffects": boolean,
    "hoverEffects": "scale" | "glow" | "lift" | "tilt" | "none",
    "loadingStyle": "skeleton" | "spinner" | "blur" | "pulse" | "none",
    "microInteractions": boolean
  },
  "effects": {
    "particles": "smoke" | "leaves" | "sparkles" | "snow" | "none",
    "backgroundPattern": "none" | "dots" | "grid" | "waves" | "cannabis-leaves" | "geometric",
    "cursorEffect": "default" | "glow" | "trail" | "custom",
    "scrollIndicator": boolean
  }
}

IMPORTANT:
- Use real Google Font names that exist
- Ensure color contrast meets WCAG AA standards (4.5:1 for text)
- Make choices that match the described aesthetic
- Be creative but practical`;
};

// ============================================
// GENERATE VIBE
// ============================================

export async function generateVibe(request: VibeGenerationRequest): Promise<VibeGenerationResponse> {
    try {
        logger.info('[VIBE-GEN] Generating vibe', { prompt: request.prompt, style: request.style });

        const response = await callClaude({
            systemPrompt: SYSTEM_PROMPT,
            userMessage: generatePrompt(request),
            temperature: request.style === 'creative' ? 1.0 : 0.7,
            maxTokens: 4096,
            model: 'claude-sonnet-4-5-20250929', // Use Sonnet for faster/cheaper generation
        });

        // Parse JSON from response
        let parsed: any;
        try {
            // Extract JSON from response (handle potential markdown code blocks)
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            parsed = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            logger.error('[VIBE-GEN] Failed to parse AI response', { response, parseError });
            return {
                success: false,
                error: 'Failed to parse AI response. Please try again.',
            };
        }

        // Validate and clean the response
        const config = validateAndCleanConfig(parsed);

        logger.info('[VIBE-GEN] Vibe generated successfully', { name: config.name });

        return {
            success: true,
            config,
            reasoning: parsed.reasoning,
            suggestions: parsed.suggestions,
        };
    } catch (error) {
        logger.error('[VIBE-GEN] Generation failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate vibe',
        };
    }
}

// ============================================
// REFINE VIBE
// ============================================

export async function refineVibe(
    currentConfig: Partial<VibeConfig>,
    refinementPrompt: string,
    orgId: string
): Promise<VibeGenerationResponse> {
    return generateVibe({
        prompt: refinementPrompt,
        orgId,
        currentConfig,
        style: 'balanced',
    });
}

// ============================================
// VALIDATE & CLEAN CONFIG
// ============================================

function validateAndCleanConfig(parsed: any): Partial<VibeConfig> {
    // Ensure all required fields exist with defaults
    const config: Partial<VibeConfig> = {
        name: parsed.name || 'Custom Vibe',
        description: parsed.description,
        generatedBy: 'ai',
    };

    // Theme
    if (parsed.theme) {
        config.theme = {
            colors: validateColors(parsed.theme.colors),
            typography: validateTypography(parsed.theme.typography),
            spacing: parsed.theme.spacing || { unit: 8, compact: false },
            radius: validateRadius(parsed.theme.radius),
            shadows: parsed.theme.shadows || { style: 'subtle' },
        };
    }

    // Components
    if (parsed.components) {
        config.components = validateComponents(parsed.components);
    }

    // Animations
    if (parsed.animations) {
        config.animations = validateAnimations(parsed.animations);
    }

    // Effects
    if (parsed.effects) {
        config.effects = validateEffects(parsed.effects);
    }

    return config;
}

function validateColors(colors: any): ColorPalette {
    const defaults: ColorPalette = {
        primary: '#16a34a',
        secondary: '#064e3b',
        accent: '#22c55e',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#0f172a',
        textMuted: '#64748b',
        border: '#e2e8f0',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
    };

    if (!colors) return defaults;

    // Validate each color is a valid hex
    const isValidHex = (c: string) => /^#[0-9A-Fa-f]{6}$/.test(c);

    return {
        primary: isValidHex(colors.primary) ? colors.primary : defaults.primary,
        secondary: isValidHex(colors.secondary) ? colors.secondary : defaults.secondary,
        accent: isValidHex(colors.accent) ? colors.accent : defaults.accent,
        background: isValidHex(colors.background) ? colors.background : defaults.background,
        surface: isValidHex(colors.surface) ? colors.surface : defaults.surface,
        text: isValidHex(colors.text) ? colors.text : defaults.text,
        textMuted: isValidHex(colors.textMuted) ? colors.textMuted : defaults.textMuted,
        border: isValidHex(colors.border) ? colors.border : defaults.border,
        success: isValidHex(colors.success) ? colors.success : defaults.success,
        warning: isValidHex(colors.warning) ? colors.warning : defaults.warning,
        error: isValidHex(colors.error) ? colors.error : defaults.error,
    };
}

function validateTypography(typography: any): TypographyConfig {
    const defaults: TypographyConfig = {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        headingWeight: 700,
        bodyWeight: 400,
        baseSize: 16,
        lineHeight: 1.5,
        letterSpacing: -0.01,
    };

    if (!typography) return defaults;

    return {
        headingFont: typography.headingFont || defaults.headingFont,
        bodyFont: typography.bodyFont || defaults.bodyFont,
        headingWeight: clamp(typography.headingWeight || defaults.headingWeight, 400, 900),
        bodyWeight: clamp(typography.bodyWeight || defaults.bodyWeight, 300, 600),
        baseSize: clamp(typography.baseSize || defaults.baseSize, 14, 18),
        lineHeight: clamp(typography.lineHeight || defaults.lineHeight, 1.4, 1.8),
        letterSpacing: clamp(typography.letterSpacing ?? defaults.letterSpacing, -0.02, 0.05),
    };
}

function validateRadius(radius: any): any {
    const defaults = {
        none: '0',
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
        default: 'lg' as const,
    };

    if (!radius) return defaults;

    return {
        none: radius.none || defaults.none,
        sm: radius.sm || defaults.sm,
        md: radius.md || defaults.md,
        lg: radius.lg || defaults.lg,
        xl: radius.xl || defaults.xl,
        full: radius.full || defaults.full,
        default: ['none', 'sm', 'md', 'lg', 'xl', 'full'].includes(radius.default)
            ? radius.default
            : defaults.default,
    };
}

function validateComponents(components: any): ComponentConfig {
    const heroOptions = ['video-bg', 'carousel', 'static', 'parallax', 'gradient-wave', 'split', 'minimal', 'full-bleed'];
    const cardOptions = ['minimal', 'detailed', 'hover-expand', 'neon-glow', 'polaroid', 'glass', 'brutalist', 'magazine'];
    const navOptions = ['sticky-top', 'sidebar', 'floating-pills', 'hamburger-only', 'transparent', 'bottom-bar'];
    const categoryOptions = ['icons', 'images', 'text-only', 'animated-tiles', 'carousel', 'masonry'];
    const chatbotOptions = ['bubble', 'sidebar', 'robot', 'custom-mascot', 'minimal', 'hidden'];
    const footerOptions = ['minimal', 'full', 'wave', 'none'];

    return {
        hero: heroOptions.includes(components.hero) ? components.hero : 'carousel',
        productCard: cardOptions.includes(components.productCard) ? components.productCard : 'detailed',
        navigation: navOptions.includes(components.navigation) ? components.navigation : 'sticky-top',
        categoryGrid: categoryOptions.includes(components.categoryGrid) ? components.categoryGrid : 'icons',
        chatbot: chatbotOptions.includes(components.chatbot) ? components.chatbot : 'bubble',
        footer: footerOptions.includes(components.footer) ? components.footer : 'full',
    };
}

function validateAnimations(animations: any): AnimationConfig {
    const transitionOptions = ['fade', 'slide', 'zoom', 'none'];
    const hoverOptions = ['scale', 'glow', 'lift', 'tilt', 'none'];
    const loadingOptions = ['skeleton', 'spinner', 'blur', 'pulse', 'none'];

    return {
        pageTransition: transitionOptions.includes(animations.pageTransition) ? animations.pageTransition : 'fade',
        scrollEffects: Boolean(animations.scrollEffects),
        hoverEffects: hoverOptions.includes(animations.hoverEffects) ? animations.hoverEffects : 'lift',
        loadingStyle: loadingOptions.includes(animations.loadingStyle) ? animations.loadingStyle : 'skeleton',
        microInteractions: Boolean(animations.microInteractions),
    };
}

function validateEffects(effects: any): SpecialEffects {
    const particleOptions = ['smoke', 'leaves', 'sparkles', 'snow', 'none'];
    const patternOptions = ['none', 'dots', 'grid', 'waves', 'cannabis-leaves', 'geometric'];
    const cursorOptions = ['default', 'glow', 'trail', 'custom'];

    return {
        particles: particleOptions.includes(effects.particles) ? effects.particles : 'none',
        backgroundPattern: patternOptions.includes(effects.backgroundPattern) ? effects.backgroundPattern : 'none',
        cursorEffect: cursorOptions.includes(effects.cursorEffect) ? effects.cursorEffect : 'default',
        scrollIndicator: Boolean(effects.scrollIndicator),
    };
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

// ============================================
// QUICK SUGGESTIONS
// ============================================

export async function getVibeSuggestions(brandName: string, industry: string = 'cannabis dispensary'): Promise<string[]> {
    try {
        const response = await callClaude({
            systemPrompt: 'You generate creative theme suggestions for websites. Return only a JSON array of 5 short descriptions.',
            userMessage: `Generate 5 unique vibe descriptions for ${brandName}, a ${industry}. Each should be 10-15 words describing a distinct aesthetic.`,
            temperature: 1.0,
            maxTokens: 500,
            model: 'claude-sonnet-4-5-20250929',
        });

        const match = response.match(/\[[\s\S]*\]/);
        if (match) {
            return JSON.parse(match[0]);
        }
        return [];
    } catch (error) {
        logger.error('[VIBE-GEN] Failed to get suggestions', { error });
        return [];
    }
}
