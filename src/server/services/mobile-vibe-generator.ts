/**
 * Mobile Vibe Generator Service
 *
 * AI-powered mobile app theme generation using Claude.
 * Generates iOS and Android-specific configurations from natural language.
 */

import { callClaude } from '@/ai/claude';
import { logger } from '@/lib/logger';
import type {
    MobileVibeConfig,
    MobileVibeGenerationRequest,
    MobileVibeGenerationResponse,
    ColorPalette,
    iOSConfig,
    AndroidConfig,
    AppIconConfig,
    SplashScreenConfig,
    PushNotificationConfig,
    MobileComponentConfig,
    MobileAnimationConfig,
} from '@/types/vibe';

// ============================================
// GENERATION PROMPT
// ============================================

const SYSTEM_PROMPT = `You are a world-class mobile app designer specializing in iOS and Android applications for cannabis dispensaries.
You create stunning, platform-native themes based on natural language descriptions.

When generating a mobile vibe configuration, consider:
1. Platform-specific design guidelines (Human Interface Guidelines for iOS, Material Design 3 for Android)
2. Native feel while maintaining brand identity
3. Performance and accessibility
4. Touch-friendly interactions and gestures
5. Cannabis industry aesthetics (professional, trustworthy, compliant)

Return ONLY valid JSON matching the schema. No explanations or markdown.`;

const generatePrompt = (request: MobileVibeGenerationRequest): string => {
    const refinementContext = request.currentConfig
        ? `\n\nCurrent configuration to refine:\n${JSON.stringify(request.currentConfig, null, 2)}`
        : '';

    const platformGuidance = request.platform === 'ios'
        ? 'Focus on iOS Human Interface Guidelines: SF Pro fonts, vibrancy, smooth animations.'
        : request.platform === 'android'
            ? 'Focus on Material Design 3: Roboto fonts, dynamic color, predictive back gesture.'
            : 'Design for both platforms with appropriate adaptations for each.';

    const styleGuidance = {
        'native': 'Follow platform conventions closely. Minimal custom styling.',
        'branded': 'Strong brand presence with custom colors and typography.',
        'playful': 'Fun, engaging with bold colors and playful animations.',
        'minimal': 'Clean, simple, performance-focused design.',
    }[request.style || 'branded'];

    const linkedVibeNote = request.linkedWebVibeId
        ? '\nThis mobile app should maintain visual consistency with the existing web theme.'
        : '';

    return `Generate a complete mobile app vibe configuration for a cannabis dispensary based on this description:

"${request.prompt}"

Platform: ${request.platform}
Style: ${styleGuidance}
${platformGuidance}
${linkedVibeNote}
${refinementContext}

Return a JSON object with this exact structure:
{
  "name": "Creative name for this vibe (2-4 words)",
  "description": "One sentence describing the app aesthetic",
  "reasoning": "Brief explanation of your design choices",
  "iosNotes": "Platform-specific guidance for iOS implementation",
  "androidNotes": "Platform-specific guidance for Android implementation",
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
    }
  },
  "ios": {
    "font": "sf-pro" | "sf-pro-rounded" | "new-york" | "custom",
    "customFontName": "optional font name if custom",
    "style": "default" | "vibrant" | "ultrathin" | "thick" | "dark",
    "blurStyle": "none" | "light" | "dark" | "prominent" | "regular",
    "cornerRadius": "system" | "rounded" | "squared",
    "usesVibrancy": boolean,
    "usesMaterial": boolean,
    "usesHaptics": boolean,
    "navigationStyle": "large-title" | "standard" | "hidden",
    "tabBarStyle": "default" | "translucent" | "opaque",
    "statusBarStyle": "default" | "light" | "dark",
    "widgetStyle": "minimal" | "detailed" | "gradient",
    "iconBackground": "solid" | "gradient" | "pattern"
  },
  "android": {
    "font": "roboto" | "roboto-serif" | "custom",
    "customFontName": "optional font name if custom",
    "usesDynamicColor": boolean,
    "colorScheme": "tonal" | "vibrant" | "expressive" | "content" | "neutral" | "monochrome",
    "surfaceTint": boolean,
    "cornerFamily": "rounded" | "cut",
    "cornerSize": "none" | "extra-small" | "small" | "medium" | "large" | "extra-large" | "full",
    "usesSharedAxisTransition": boolean,
    "usesPredictiveBack": boolean,
    "navigationStyle": "rail" | "drawer" | "bottom-nav",
    "topAppBarStyle": "small" | "medium" | "large" | "center-aligned",
    "statusBarStyle": "edge-to-edge" | "default",
    "iconForeground": "logo" | "logo-with-padding",
    "iconBackground": "solid" | "gradient" | "pattern",
    "widgetShape": "rounded-rectangle" | "squircle" | "circle"
  },
  "appIcon": {
    "primaryColor": "#hex",
    "secondaryColor": "#hex (optional)",
    "style": "flat" | "gradient" | "glossy" | "3d" | "outlined"
  },
  "splashScreen": {
    "style": "logo-centered" | "logo-bottom" | "animated" | "gradient-fade",
    "backgroundColor": "#hex",
    "androidAnimatedIcon": boolean,
    "iosUsesStoryboard": boolean
  },
  "pushNotifications": {
    "iosStyle": "default" | "media" | "expandable",
    "iosUsesRichMedia": boolean,
    "androidStyle": "default" | "big-text" | "big-picture" | "inbox" | "messaging",
    "androidChannelImportance": "default" | "high" | "low" | "min",
    "androidAccentColor": "#hex"
  },
  "components": {
    "productCard": "list" | "compact-grid" | "large-grid" | "horizontal-scroll" | "story-card" | "detailed-list",
    "navigation": "tab-bar" | "bottom-nav" | "nav-drawer" | "nav-rail" | "floating-action",
    "chat": "floating-bubble" | "tab-integrated" | "full-screen" | "slide-up-sheet" | "hidden",
    "cart": "floating-button" | "tab-badge" | "slide-up-summary" | "full-screen",
    "usesSearchBar": boolean,
    "usesFiltersSheet": boolean,
    "usesCategoryChips": boolean,
    "usesQuickAdd": boolean
  },
  "animations": {
    "screenTransition": "push" | "modal" | "fade" | "shared-element" | "none",
    "listAnimation": "none" | "fade-in" | "slide-up" | "stagger",
    "tapFeedback": "ripple" | "highlight" | "scale" | "none",
    "longPressFeedback": boolean,
    "skeletonStyle": "shimmer" | "pulse" | "fade",
    "pullToRefreshStyle": "default" | "custom-lottie",
    "useHaptics": boolean,
    "hapticIntensity": "light" | "medium" | "heavy"
  }
}

IMPORTANT:
- iOS should feel native with SF fonts and vibrancy effects
- Android should follow Material Design 3 with dynamic color support
- Ensure colors work well on both light and dark modes
- Consider accessibility and touch target sizes (44pt iOS, 48dp Android)
- Make choices that match the described aesthetic while respecting platform conventions`;
};

// ============================================
// GENERATE MOBILE VIBE
// ============================================

export async function generateMobileVibe(
    request: MobileVibeGenerationRequest
): Promise<MobileVibeGenerationResponse> {
    try {
        logger.info('[MOBILE-VIBE-GEN] Generating mobile vibe', {
            prompt: request.prompt,
            platform: request.platform,
            style: request.style,
        });

        const response = await callClaude({
            systemPrompt: SYSTEM_PROMPT,
            userMessage: generatePrompt(request),
            temperature: request.style === 'playful' ? 1.0 : 0.7,
            maxTokens: 6000,
            model: 'claude-sonnet-4-5-20250929',
        });

        // Parse JSON from response
        let parsed: any;
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            parsed = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            logger.error('[MOBILE-VIBE-GEN] Failed to parse AI response', {
                error: parseError instanceof Error ? parseError.message : String(parseError),
            });
            return {
                success: false,
                error: 'Failed to parse AI response. Please try again.',
            };
        }

        // Validate and clean the response
        const config = validateAndCleanMobileConfig(parsed, request.platform);

        logger.info('[MOBILE-VIBE-GEN] Mobile vibe generated successfully', { name: config.name });

        return {
            success: true,
            config,
            reasoning: parsed.reasoning,
            iosNotes: parsed.iosNotes,
            androidNotes: parsed.androidNotes,
            suggestions: parsed.suggestions,
        };
    } catch (error) {
        logger.error('[MOBILE-VIBE-GEN] Generation failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate mobile vibe',
        };
    }
}

// ============================================
// REFINE MOBILE VIBE
// ============================================

export async function refineMobileVibe(
    currentConfig: Partial<MobileVibeConfig>,
    refinementPrompt: string,
    orgId: string
): Promise<MobileVibeGenerationResponse> {
    return generateMobileVibe({
        prompt: refinementPrompt,
        orgId,
        platform: currentConfig.platform || 'both',
        currentConfig,
        style: 'branded',
    });
}

// ============================================
// VALIDATE & CLEAN CONFIG
// ============================================

function validateAndCleanMobileConfig(
    parsed: any,
    platform: 'ios' | 'android' | 'both'
): Partial<MobileVibeConfig> {
    const config: Partial<MobileVibeConfig> = {
        name: parsed.name || 'Custom Mobile Vibe',
        description: parsed.description,
        platform,
        generatedBy: 'ai',
    };

    // Theme colors
    if (parsed.theme?.colors) {
        config.theme = {
            colors: validateColors(parsed.theme.colors),
            typography: {
                ios: validateiOSConfig(parsed.ios),
                android: validateAndroidConfig(parsed.android),
            },
        };
    }

    // Platform configs
    if (platform === 'ios' || platform === 'both') {
        config.ios = validateiOSConfig(parsed.ios);
    }
    if (platform === 'android' || platform === 'both') {
        config.android = validateAndroidConfig(parsed.android);
    }

    // App Icon
    if (parsed.appIcon) {
        config.appIcon = validateAppIcon(parsed.appIcon, parsed.theme?.colors);
    }

    // Splash Screen
    if (parsed.splashScreen) {
        config.splashScreen = validateSplashScreen(parsed.splashScreen, parsed.theme?.colors);
    }

    // Push Notifications
    if (parsed.pushNotifications) {
        config.pushNotifications = validatePushNotifications(parsed.pushNotifications);
    }

    // Components
    if (parsed.components) {
        config.components = validateMobileComponents(parsed.components);
    }

    // Animations
    if (parsed.animations) {
        config.animations = validateMobileAnimations(parsed.animations);
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

    const isValidHex = (c: string) => /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(c);

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

function validateiOSConfig(ios: any): iOSConfig {
    const defaults: iOSConfig = {
        font: 'sf-pro',
        style: 'default',
        blurStyle: 'regular',
        cornerRadius: 'system',
        usesVibrancy: true,
        usesMaterial: true,
        usesHaptics: true,
        navigationStyle: 'large-title',
        tabBarStyle: 'translucent',
        statusBarStyle: 'default',
        widgetStyle: 'minimal',
        iconBackground: 'solid',
    };

    if (!ios) return defaults;

    const fontOptions = ['sf-pro', 'sf-pro-rounded', 'new-york', 'custom'];
    const styleOptions = ['default', 'vibrant', 'ultrathin', 'thick', 'dark'];
    const blurOptions = ['none', 'light', 'dark', 'prominent', 'regular'];
    const cornerOptions = ['system', 'rounded', 'squared'];
    const navOptions = ['large-title', 'standard', 'hidden'];
    const tabBarOptions = ['default', 'translucent', 'opaque'];
    const statusOptions = ['default', 'light', 'dark'];
    const widgetOptions = ['minimal', 'detailed', 'gradient'];
    const iconBgOptions = ['solid', 'gradient', 'pattern'];

    return {
        font: fontOptions.includes(ios.font) ? ios.font : defaults.font,
        customFontName: ios.customFontName,
        style: styleOptions.includes(ios.style) ? ios.style : defaults.style,
        blurStyle: blurOptions.includes(ios.blurStyle) ? ios.blurStyle : defaults.blurStyle,
        cornerRadius: cornerOptions.includes(ios.cornerRadius) ? ios.cornerRadius : defaults.cornerRadius,
        usesVibrancy: Boolean(ios.usesVibrancy ?? defaults.usesVibrancy),
        usesMaterial: Boolean(ios.usesMaterial ?? defaults.usesMaterial),
        usesHaptics: Boolean(ios.usesHaptics ?? defaults.usesHaptics),
        navigationStyle: navOptions.includes(ios.navigationStyle) ? ios.navigationStyle : defaults.navigationStyle,
        tabBarStyle: tabBarOptions.includes(ios.tabBarStyle) ? ios.tabBarStyle : defaults.tabBarStyle,
        statusBarStyle: statusOptions.includes(ios.statusBarStyle) ? ios.statusBarStyle : defaults.statusBarStyle,
        widgetStyle: widgetOptions.includes(ios.widgetStyle) ? ios.widgetStyle : defaults.widgetStyle,
        iconBackground: iconBgOptions.includes(ios.iconBackground) ? ios.iconBackground : defaults.iconBackground,
    };
}

function validateAndroidConfig(android: any): AndroidConfig {
    const defaults: AndroidConfig = {
        font: 'roboto',
        usesDynamicColor: true,
        colorScheme: 'tonal',
        surfaceTint: true,
        cornerFamily: 'rounded',
        cornerSize: 'medium',
        usesSharedAxisTransition: true,
        usesPredictiveBack: true,
        navigationStyle: 'bottom-nav',
        topAppBarStyle: 'large',
        statusBarStyle: 'edge-to-edge',
        iconForeground: 'logo-with-padding',
        iconBackground: 'solid',
        widgetShape: 'rounded-rectangle',
    };

    if (!android) return defaults;

    const fontOptions = ['roboto', 'roboto-serif', 'custom'];
    const schemeOptions = ['tonal', 'vibrant', 'expressive', 'content', 'neutral', 'monochrome'];
    const cornerFamilyOptions = ['rounded', 'cut'];
    const cornerSizeOptions = ['none', 'extra-small', 'small', 'medium', 'large', 'extra-large', 'full'];
    const navOptions = ['rail', 'drawer', 'bottom-nav'];
    const appBarOptions = ['small', 'medium', 'large', 'center-aligned'];
    const statusOptions = ['edge-to-edge', 'default'];
    const iconFgOptions = ['logo', 'logo-with-padding'];
    const iconBgOptions = ['solid', 'gradient', 'pattern'];
    const widgetOptions = ['rounded-rectangle', 'squircle', 'circle'];

    return {
        font: fontOptions.includes(android.font) ? android.font : defaults.font,
        customFontName: android.customFontName,
        usesDynamicColor: Boolean(android.usesDynamicColor ?? defaults.usesDynamicColor),
        colorScheme: schemeOptions.includes(android.colorScheme) ? android.colorScheme : defaults.colorScheme,
        surfaceTint: Boolean(android.surfaceTint ?? defaults.surfaceTint),
        cornerFamily: cornerFamilyOptions.includes(android.cornerFamily) ? android.cornerFamily : defaults.cornerFamily,
        cornerSize: cornerSizeOptions.includes(android.cornerSize) ? android.cornerSize : defaults.cornerSize,
        usesSharedAxisTransition: Boolean(android.usesSharedAxisTransition ?? defaults.usesSharedAxisTransition),
        usesPredictiveBack: Boolean(android.usesPredictiveBack ?? defaults.usesPredictiveBack),
        navigationStyle: navOptions.includes(android.navigationStyle) ? android.navigationStyle : defaults.navigationStyle,
        topAppBarStyle: appBarOptions.includes(android.topAppBarStyle) ? android.topAppBarStyle : defaults.topAppBarStyle,
        statusBarStyle: statusOptions.includes(android.statusBarStyle) ? android.statusBarStyle : defaults.statusBarStyle,
        iconForeground: iconFgOptions.includes(android.iconForeground) ? android.iconForeground : defaults.iconForeground,
        iconBackground: iconBgOptions.includes(android.iconBackground) ? android.iconBackground : defaults.iconBackground,
        widgetShape: widgetOptions.includes(android.widgetShape) ? android.widgetShape : defaults.widgetShape,
    };
}

function validateAppIcon(icon: any, colors?: any): AppIconConfig {
    const primaryColor = colors?.primary || '#16a34a';
    const defaults: AppIconConfig = {
        primaryColor,
        style: 'gradient',
    };

    if (!icon) return defaults;

    const styleOptions = ['flat', 'gradient', 'glossy', '3d', 'outlined'];
    const isValidHex = (c: string) => /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(c);

    return {
        baseIconUrl: icon.baseIconUrl,
        iosIconUrl: icon.iosIconUrl,
        androidForegroundUrl: icon.androidForegroundUrl,
        androidBackgroundColor: isValidHex(icon.androidBackgroundColor) ? icon.androidBackgroundColor : undefined,
        androidBackgroundUrl: icon.androidBackgroundUrl,
        primaryColor: isValidHex(icon.primaryColor) ? icon.primaryColor : defaults.primaryColor,
        secondaryColor: isValidHex(icon.secondaryColor) ? icon.secondaryColor : undefined,
        style: styleOptions.includes(icon.style) ? icon.style : defaults.style,
    };
}

function validateSplashScreen(splash: any, colors?: any): SplashScreenConfig {
    const backgroundColor = colors?.background || '#ffffff';
    const defaults: SplashScreenConfig = {
        style: 'logo-centered',
        backgroundColor,
        iosUsesStoryboard: true,
    };

    if (!splash) return defaults;

    const styleOptions = ['logo-centered', 'logo-bottom', 'animated', 'gradient-fade'];
    const isValidHex = (c: string) => /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(c);

    return {
        style: styleOptions.includes(splash.style) ? splash.style : defaults.style,
        backgroundColor: isValidHex(splash.backgroundColor) ? splash.backgroundColor : defaults.backgroundColor,
        logoUrl: splash.logoUrl,
        animationUrl: splash.animationUrl,
        androidAnimatedIcon: Boolean(splash.androidAnimatedIcon),
        androidBrandingImage: splash.androidBrandingImage,
        iosUsesStoryboard: Boolean(splash.iosUsesStoryboard ?? defaults.iosUsesStoryboard),
    };
}

function validatePushNotifications(push: any): PushNotificationConfig {
    const defaults: PushNotificationConfig = {
        iosStyle: 'default',
        iosUsesRichMedia: true,
        androidStyle: 'default',
        androidChannelImportance: 'default',
    };

    if (!push) return defaults;

    const iosStyleOptions = ['default', 'media', 'expandable'];
    const androidStyleOptions = ['default', 'big-text', 'big-picture', 'inbox', 'messaging'];
    const importanceOptions = ['default', 'high', 'low', 'min'];
    const isValidHex = (c: string) => /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(c);

    return {
        iosStyle: iosStyleOptions.includes(push.iosStyle) ? push.iosStyle : defaults.iosStyle,
        iosUsesRichMedia: Boolean(push.iosUsesRichMedia ?? defaults.iosUsesRichMedia),
        androidStyle: androidStyleOptions.includes(push.androidStyle) ? push.androidStyle : defaults.androidStyle,
        androidChannelImportance: importanceOptions.includes(push.androidChannelImportance)
            ? push.androidChannelImportance
            : defaults.androidChannelImportance,
        androidAccentColor: isValidHex(push.androidAccentColor) ? push.androidAccentColor : undefined,
    };
}

function validateMobileComponents(components: any): MobileComponentConfig {
    const cardOptions = ['list', 'compact-grid', 'large-grid', 'horizontal-scroll', 'story-card', 'detailed-list'];
    const navOptions = ['tab-bar', 'bottom-nav', 'nav-drawer', 'nav-rail', 'floating-action'];
    const chatOptions = ['floating-bubble', 'tab-integrated', 'full-screen', 'slide-up-sheet', 'hidden'];
    const cartOptions = ['floating-button', 'tab-badge', 'slide-up-summary', 'full-screen'];

    return {
        productCard: cardOptions.includes(components.productCard) ? components.productCard : 'large-grid',
        navigation: navOptions.includes(components.navigation) ? components.navigation : 'tab-bar',
        chat: chatOptions.includes(components.chat) ? components.chat : 'floating-bubble',
        cart: cartOptions.includes(components.cart) ? components.cart : 'tab-badge',
        usesSearchBar: Boolean(components.usesSearchBar ?? true),
        usesFiltersSheet: Boolean(components.usesFiltersSheet ?? true),
        usesCategoryChips: Boolean(components.usesCategoryChips ?? true),
        usesQuickAdd: Boolean(components.usesQuickAdd ?? false),
    };
}

function validateMobileAnimations(animations: any): MobileAnimationConfig {
    const transitionOptions = ['push', 'modal', 'fade', 'shared-element', 'none'];
    const listOptions = ['none', 'fade-in', 'slide-up', 'stagger'];
    const tapOptions = ['ripple', 'highlight', 'scale', 'none'];
    const skeletonOptions = ['shimmer', 'pulse', 'fade'];
    const pullOptions = ['default', 'custom-lottie'];
    const hapticOptions = ['light', 'medium', 'heavy'];

    return {
        screenTransition: transitionOptions.includes(animations.screenTransition)
            ? animations.screenTransition
            : 'push',
        listAnimation: listOptions.includes(animations.listAnimation)
            ? animations.listAnimation
            : 'fade-in',
        tapFeedback: tapOptions.includes(animations.tapFeedback)
            ? animations.tapFeedback
            : 'ripple',
        longPressFeedback: Boolean(animations.longPressFeedback ?? true),
        skeletonStyle: skeletonOptions.includes(animations.skeletonStyle)
            ? animations.skeletonStyle
            : 'shimmer',
        pullToRefreshStyle: pullOptions.includes(animations.pullToRefreshStyle)
            ? animations.pullToRefreshStyle
            : 'default',
        useHaptics: Boolean(animations.useHaptics ?? true),
        hapticIntensity: hapticOptions.includes(animations.hapticIntensity)
            ? animations.hapticIntensity
            : 'light',
    };
}

// ============================================
// GENERATE FROM WEB VIBE
// ============================================

export async function generateMobileVibeFromWebVibe(
    webVibeColors: ColorPalette,
    prompt: string,
    orgId: string,
    platform: 'ios' | 'android' | 'both' = 'both'
): Promise<MobileVibeGenerationResponse> {
    const enhancedPrompt = `Create a mobile app theme that matches this existing web brand:
Primary: ${webVibeColors.primary}
Secondary: ${webVibeColors.secondary}
Accent: ${webVibeColors.accent}
Background: ${webVibeColors.background}

Additional requirements: ${prompt}

Keep the colors consistent with the web theme while adapting to mobile platform conventions.`;

    return generateMobileVibe({
        prompt: enhancedPrompt,
        orgId,
        platform,
        style: 'branded',
    });
}

// ============================================
// QUICK MOBILE SUGGESTIONS
// ============================================

export async function getMobileVibeSuggestions(
    brandName: string,
    platform: 'ios' | 'android' | 'both' = 'both'
): Promise<string[]> {
    try {
        const platformContext = platform === 'ios'
            ? 'iOS app'
            : platform === 'android'
                ? 'Android app'
                : 'mobile app';

        const response = await callClaude({
            systemPrompt: 'You generate creative mobile app theme suggestions. Return only a JSON array of 5 short descriptions.',
            userMessage: `Generate 5 unique ${platformContext} theme descriptions for ${brandName}, a cannabis dispensary. Each should be 10-15 words describing a distinct aesthetic that works well on mobile.`,
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
        logger.error('[MOBILE-VIBE-GEN] Failed to get suggestions', {
            error: error instanceof Error ? error.message : String(error),
        });
        return [];
    }
}
