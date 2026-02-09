/**
 * Vibe Studio Types
 *
 * Type definitions for the AI-powered menu/website customization system.
 * Allows brands and dispensaries to "vibe code" their storefront using natural language.
 */

// ============================================
// COLOR & THEME TYPES
// ============================================

export interface ColorPalette {
    primary: string;        // Main brand color
    secondary: string;      // Supporting color
    accent: string;         // Highlight/CTA color
    background: string;     // Page background
    surface: string;        // Card/component background
    text: string;           // Primary text color
    textMuted: string;      // Secondary text color
    border: string;         // Border color
    success: string;        // Success states
    warning: string;        // Warning states
    error: string;          // Error states
}

export interface TypographyConfig {
    headingFont: string;    // Font family for headings
    bodyFont: string;       // Font family for body text
    headingWeight: number;  // Font weight for headings (400-900)
    bodyWeight: number;     // Font weight for body (300-600)
    baseSize: number;       // Base font size in px (14-18)
    lineHeight: number;     // Line height multiplier (1.4-1.8)
    letterSpacing: number;  // Letter spacing in em (-0.02 to 0.05)
}

export interface SpacingScale {
    unit: number;           // Base spacing unit in px (4 or 8)
    compact: boolean;       // Tighter spacing overall
}

export interface RadiusScale {
    none: string;           // 0
    sm: string;             // 4px
    md: string;             // 8px
    lg: string;             // 16px
    xl: string;             // 24px
    full: string;           // 9999px
    default: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export interface ShadowConfig {
    style: 'none' | 'subtle' | 'medium' | 'dramatic' | 'neon';
    color?: string;         // Shadow color for neon effect
}

// ============================================
// COMPONENT VARIANT TYPES
// ============================================

export type HeroVariant =
    | 'video-bg'           // Video background with overlay
    | 'carousel'           // Image carousel (current default)
    | 'static'             // Single hero image
    | 'parallax'           // Parallax scrolling effect
    | 'gradient-wave'      // Animated gradient background
    | 'split'              // 50/50 image and content
    | 'minimal'            // Text only, no hero image
    | 'full-bleed';        // Full-screen immersive

export type ProductCardVariant =
    | 'minimal'            // Clean, simple card
    | 'detailed'           // Full info with THC/CBD, effects
    | 'hover-expand'       // Expands on hover with details
    | 'neon-glow'          // Glowing border effect
    | 'polaroid'           // Vintage photo style
    | 'glass'              // Glassmorphism effect
    | 'brutalist'          // Bold, stark design
    | 'magazine';          // Editorial/lifestyle feel

export type NavigationVariant =
    | 'sticky-top'         // Fixed header
    | 'sidebar'            // Left sidebar nav
    | 'floating-pills'     // Floating category pills
    | 'hamburger-only'     // Mobile-first hamburger
    | 'transparent'        // Transparent over hero
    | 'bottom-bar';        // Mobile bottom navigation

export type CategoryGridVariant =
    | 'icons'              // Icon + text cards
    | 'images'             // Full image backgrounds
    | 'text-only'          // Simple text links
    | 'animated-tiles'     // Hover animations
    | 'carousel'           // Horizontal scroll
    | 'masonry';           // Pinterest-style grid

export type ChatbotVariant =
    | 'bubble'             // Floating chat bubble (default)
    | 'sidebar'            // Slide-out sidebar
    | 'robot'              // Robot/AI avatar
    | 'custom-mascot'      // Brand's custom mascot
    | 'minimal'            // Text-only, no avatar
    | 'hidden';            // No chatbot

export type FooterVariant =
    | 'minimal'            // Simple links + copyright
    | 'full'               // Full sitemap + social
    | 'wave'               // Decorative wave top
    | 'none';              // No footer

// ============================================
// ANIMATION & EFFECTS
// ============================================

export interface AnimationConfig {
    pageTransition: 'fade' | 'slide' | 'zoom' | 'none';
    scrollEffects: boolean;                              // Parallax, reveal, etc.
    hoverEffects: 'scale' | 'glow' | 'lift' | 'tilt' | 'none';
    loadingStyle: 'skeleton' | 'spinner' | 'blur' | 'pulse' | 'none';
    microInteractions: boolean;                          // Button clicks, toggles, etc.
}

export interface SpecialEffects {
    particles?: 'smoke' | 'leaves' | 'sparkles' | 'snow' | 'none';
    backgroundPattern?: 'none' | 'dots' | 'grid' | 'waves' | 'cannabis-leaves' | 'geometric';
    cursorEffect?: 'default' | 'glow' | 'trail' | 'custom';
    scrollIndicator?: boolean;
}

// ============================================
// COMPONENT CONFIGURATION
// ============================================

export interface ComponentConfig {
    hero: HeroVariant;
    productCard: ProductCardVariant;
    navigation: NavigationVariant;
    categoryGrid: CategoryGridVariant;
    chatbot: ChatbotVariant;
    footer: FooterVariant;
}

// ============================================
// MAIN VIBE CONFIG
// ============================================

export interface VibeConfig {
    id: string;
    orgId: string;
    name: string;                           // User-friendly name: "Cyberpunk v3"
    description?: string;                   // Brief description

    // AI Generation Context
    prompt: string;                         // Original user prompt
    refinements?: string[];                 // Follow-up refinement prompts
    generatedAt: Date;
    generatedBy: 'ai' | 'manual' | 'template';

    // Theme Configuration
    theme: {
        colors: ColorPalette;
        typography: TypographyConfig;
        spacing: SpacingScale;
        radius: RadiusScale;
        shadows: ShadowConfig;
    };

    // Component Selections
    components: ComponentConfig;

    // Animations & Effects
    animations: AnimationConfig;
    effects: SpecialEffects;

    // Custom Overrides (Advanced Users)
    customCSS?: string;                     // Raw CSS overrides
    customVariables?: Record<string, string>; // CSS custom properties

    // Media
    heroVideoUrl?: string;                  // For video-bg hero
    heroImageUrl?: string;                  // For static/parallax hero
    backgroundImageUrl?: string;            // Page background image
    faviconUrl?: string;                    // Custom favicon

    // Status & Publishing
    status: 'draft' | 'published' | 'archived';
    publishedAt?: Date;
    version: number;                        // Increment on each save

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;                      // User ID
}

// ============================================
// VIBE TEMPLATES (Pre-built Starting Points)
// ============================================

export interface VibeTemplate {
    id: string;
    name: string;
    description: string;
    thumbnail: string;                      // Preview image URL
    category: 'modern' | 'classic' | 'bold' | 'minimal' | 'themed';
    tags: string[];                         // Searchable tags
    config: Omit<VibeConfig, 'id' | 'orgId' | 'prompt' | 'createdAt' | 'updatedAt' | 'createdBy' | 'status' | 'version'>;
    popularity: number;                     // Usage count
    featured: boolean;
}

// ============================================
// AI GENERATION TYPES
// ============================================

export interface VibeGenerationRequest {
    prompt: string;
    orgId: string;
    currentConfig?: Partial<VibeConfig>;    // For refinements
    style?: 'creative' | 'balanced' | 'conservative';
}

export interface VibeGenerationResponse {
    success: boolean;
    config?: Partial<VibeConfig>;
    reasoning?: string;                     // AI's explanation of choices
    suggestions?: string[];                 // Alternative ideas
    error?: string;
}

// ============================================
// PRESET VIBES (Quick Starts)
// ============================================

export const VIBE_PRESETS: Record<string, Partial<VibeConfig>> = {
    'modern-clean': {
        name: 'Modern Clean',
        theme: {
            colors: {
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
            },
            typography: {
                headingFont: 'Inter',
                bodyFont: 'Inter',
                headingWeight: 700,
                bodyWeight: 400,
                baseSize: 16,
                lineHeight: 1.5,
                letterSpacing: -0.01,
            },
            spacing: { unit: 8, compact: false },
            radius: { none: '0', sm: '4px', md: '8px', lg: '16px', xl: '24px', full: '9999px', default: 'lg' },
            shadows: { style: 'subtle' },
        },
        components: {
            hero: 'carousel',
            productCard: 'detailed',
            navigation: 'sticky-top',
            categoryGrid: 'icons',
            chatbot: 'bubble',
            footer: 'full',
        },
        animations: {
            pageTransition: 'fade',
            scrollEffects: false,
            hoverEffects: 'lift',
            loadingStyle: 'skeleton',
            microInteractions: true,
        },
        effects: {
            particles: 'none',
            backgroundPattern: 'none',
        },
    },
    'dark-luxury': {
        name: 'Dark Luxury',
        theme: {
            colors: {
                primary: '#d4af37',
                secondary: '#1a1a1a',
                accent: '#ffd700',
                background: '#0a0a0a',
                surface: '#1a1a1a',
                text: '#f5f5f5',
                textMuted: '#a0a0a0',
                border: '#333333',
                success: '#4ade80',
                warning: '#fbbf24',
                error: '#f87171',
            },
            typography: {
                headingFont: 'Playfair Display',
                bodyFont: 'Inter',
                headingWeight: 600,
                bodyWeight: 400,
                baseSize: 16,
                lineHeight: 1.6,
                letterSpacing: 0.02,
            },
            spacing: { unit: 8, compact: false },
            radius: { none: '0', sm: '2px', md: '4px', lg: '8px', xl: '12px', full: '9999px', default: 'sm' },
            shadows: { style: 'dramatic' },
        },
        components: {
            hero: 'video-bg',
            productCard: 'glass',
            navigation: 'transparent',
            categoryGrid: 'images',
            chatbot: 'sidebar',
            footer: 'minimal',
        },
        animations: {
            pageTransition: 'fade',
            scrollEffects: true,
            hoverEffects: 'glow',
            loadingStyle: 'blur',
            microInteractions: true,
        },
        effects: {
            particles: 'smoke',
            backgroundPattern: 'none',
        },
    },
    'cyberpunk': {
        name: 'Cyberpunk',
        theme: {
            colors: {
                primary: '#00ff88',
                secondary: '#0a0a0a',
                accent: '#ff00ff',
                background: '#0d0d0d',
                surface: '#1a1a2e',
                text: '#e0e0e0',
                textMuted: '#808080',
                border: '#00ff8840',
                success: '#00ff88',
                warning: '#ffff00',
                error: '#ff0055',
            },
            typography: {
                headingFont: 'Orbitron',
                bodyFont: 'Space Grotesk',
                headingWeight: 700,
                bodyWeight: 400,
                baseSize: 15,
                lineHeight: 1.5,
                letterSpacing: 0.03,
            },
            spacing: { unit: 8, compact: true },
            radius: { none: '0', sm: '0', md: '4px', lg: '8px', xl: '0', full: '0', default: 'none' },
            shadows: { style: 'neon', color: '#00ff88' },
        },
        components: {
            hero: 'video-bg',
            productCard: 'neon-glow',
            navigation: 'floating-pills',
            categoryGrid: 'animated-tiles',
            chatbot: 'robot',
            footer: 'minimal',
        },
        animations: {
            pageTransition: 'slide',
            scrollEffects: true,
            hoverEffects: 'glow',
            loadingStyle: 'pulse',
            microInteractions: true,
        },
        effects: {
            particles: 'sparkles',
            backgroundPattern: 'grid',
            cursorEffect: 'glow',
        },
    },
    'organic-natural': {
        name: 'Organic Natural',
        theme: {
            colors: {
                primary: '#2d5a27',
                secondary: '#8b7355',
                accent: '#a3be8c',
                background: '#faf8f5',
                surface: '#ffffff',
                text: '#2d3436',
                textMuted: '#636e72',
                border: '#dfe6e9',
                success: '#27ae60',
                warning: '#f39c12',
                error: '#e74c3c',
            },
            typography: {
                headingFont: 'Fraunces',
                bodyFont: 'Source Sans Pro',
                headingWeight: 600,
                bodyWeight: 400,
                baseSize: 17,
                lineHeight: 1.7,
                letterSpacing: 0,
            },
            spacing: { unit: 8, compact: false },
            radius: { none: '0', sm: '8px', md: '16px', lg: '24px', xl: '32px', full: '9999px', default: 'lg' },
            shadows: { style: 'subtle' },
        },
        components: {
            hero: 'parallax',
            productCard: 'polaroid',
            navigation: 'sticky-top',
            categoryGrid: 'images',
            chatbot: 'custom-mascot',
            footer: 'wave',
        },
        animations: {
            pageTransition: 'fade',
            scrollEffects: true,
            hoverEffects: 'scale',
            loadingStyle: 'skeleton',
            microInteractions: false,
        },
        effects: {
            particles: 'leaves',
            backgroundPattern: 'cannabis-leaves',
        },
    },
    'bold-street': {
        name: 'Bold Street',
        theme: {
            colors: {
                primary: '#ff3366',
                secondary: '#1a1a1a',
                accent: '#ffcc00',
                background: '#ffffff',
                surface: '#f0f0f0',
                text: '#1a1a1a',
                textMuted: '#666666',
                border: '#1a1a1a',
                success: '#00cc66',
                warning: '#ffcc00',
                error: '#ff3366',
            },
            typography: {
                headingFont: 'Anton',
                bodyFont: 'Roboto',
                headingWeight: 400,
                bodyWeight: 400,
                baseSize: 16,
                lineHeight: 1.4,
                letterSpacing: 0.05,
            },
            spacing: { unit: 4, compact: true },
            radius: { none: '0', sm: '0', md: '0', lg: '0', xl: '0', full: '9999px', default: 'none' },
            shadows: { style: 'none' },
        },
        components: {
            hero: 'full-bleed',
            productCard: 'brutalist',
            navigation: 'hamburger-only',
            categoryGrid: 'text-only',
            chatbot: 'minimal',
            footer: 'none',
        },
        animations: {
            pageTransition: 'slide',
            scrollEffects: false,
            hoverEffects: 'none',
            loadingStyle: 'none',
            microInteractions: false,
        },
        effects: {
            particles: 'none',
            backgroundPattern: 'geometric',
        },
    },
};

// ============================================
// FONT OPTIONS (Google Fonts)
// ============================================

export const AVAILABLE_FONTS = {
    heading: [
        'Inter', 'Playfair Display', 'Orbitron', 'Fraunces', 'Anton',
        'Montserrat', 'Poppins', 'Raleway', 'Oswald', 'Merriweather',
        'Lora', 'Roboto Slab', 'Bebas Neue', 'Space Grotesk', 'DM Serif Display',
    ],
    body: [
        'Inter', 'Roboto', 'Open Sans', 'Source Sans Pro', 'Lato',
        'Nunito', 'Work Sans', 'Space Grotesk', 'IBM Plex Sans', 'Outfit',
    ],
};

// ============================================
// MOBILE APP TYPES
// ============================================

export type MobilePlatform = 'ios' | 'android' | 'both';

// iOS-specific design tokens
export interface iOSConfig {
    // Typography - iOS uses SF Pro by default but custom fonts can be bundled
    font: 'sf-pro' | 'sf-pro-rounded' | 'new-york' | 'custom';
    customFontName?: string;

    // Visual Style
    style: 'default' | 'vibrant' | 'ultrathin' | 'thick' | 'dark';
    blurStyle: 'none' | 'light' | 'dark' | 'prominent' | 'regular';
    cornerRadius: 'system' | 'rounded' | 'squared'; // iOS prefers rounded

    // Material effects
    usesVibrancy: boolean;          // Translucent blur effects
    usesMaterial: boolean;          // Material backgrounds
    usesHaptics: boolean;           // Haptic feedback

    // Navigation
    navigationStyle: 'large-title' | 'standard' | 'hidden';
    tabBarStyle: 'default' | 'translucent' | 'opaque';
    statusBarStyle: 'default' | 'light' | 'dark';

    // Home screen widget
    widgetStyle: 'minimal' | 'detailed' | 'gradient';

    // App Icon corners (always superellipse on iOS)
    iconBackground: 'solid' | 'gradient' | 'pattern';
}

// Android-specific design tokens (Material Design 3)
export interface AndroidConfig {
    // Typography
    font: 'roboto' | 'roboto-serif' | 'custom';
    customFontName?: string;

    // Material You / Dynamic Color
    usesDynamicColor: boolean;      // Adapt to user's wallpaper colors
    colorScheme: 'tonal' | 'vibrant' | 'expressive' | 'content' | 'neutral' | 'monochrome';

    // Visual Style
    surfaceTint: boolean;           // Tinted elevation
    cornerFamily: 'rounded' | 'cut'; // Shape corners
    cornerSize: 'none' | 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large' | 'full';

    // Motion
    usesSharedAxisTransition: boolean;
    usesPredictiveBack: boolean;    // Android 14+ gesture

    // Navigation
    navigationStyle: 'rail' | 'drawer' | 'bottom-nav';
    topAppBarStyle: 'small' | 'medium' | 'large' | 'center-aligned';
    statusBarStyle: 'edge-to-edge' | 'default';

    // Adaptive icons
    iconForeground: 'logo' | 'logo-with-padding';
    iconBackground: 'solid' | 'gradient' | 'pattern';

    // Widget
    widgetShape: 'rounded-rectangle' | 'squircle' | 'circle';
}

// App Icon Configuration
export interface AppIconConfig {
    // Base icon (will be adapted per platform)
    baseIconUrl?: string;

    // iOS-specific (1024x1024 for App Store)
    iosIconUrl?: string;

    // Android adaptive icon layers
    androidForegroundUrl?: string;  // Foreground layer
    androidBackgroundColor?: string; // Or solid color
    androidBackgroundUrl?: string;   // Or image

    // Colors for generated icons
    primaryColor: string;
    secondaryColor?: string;
    style: 'flat' | 'gradient' | 'glossy' | '3d' | 'outlined';
}

// Splash Screen / Launch Screen
export interface SplashScreenConfig {
    style: 'logo-centered' | 'logo-bottom' | 'animated' | 'gradient-fade';
    backgroundColor: string;
    logoUrl?: string;
    animationUrl?: string;          // Lottie animation for iOS/Android

    // Android 12+ Splash Screen API
    androidAnimatedIcon?: boolean;
    androidBrandingImage?: string;

    // iOS Launch Screen
    iosUsesStoryboard: boolean;
}

// Push Notification Styling
export interface PushNotificationConfig {
    // iOS
    iosStyle: 'default' | 'media' | 'expandable';
    iosUsesRichMedia: boolean;

    // Android
    androidStyle: 'default' | 'big-text' | 'big-picture' | 'inbox' | 'messaging';
    androidChannelImportance: 'default' | 'high' | 'low' | 'min';
    androidAccentColor?: string;
}

// Mobile Component Variants
export type MobileProductCardVariant =
    | 'list'               // Simple list item
    | 'compact-grid'       // Small grid cards
    | 'large-grid'         // Large image-forward cards
    | 'horizontal-scroll'  // Horizontal cards in carousel
    | 'story-card'         // Full-height story-like cards
    | 'detailed-list';     // List with full info

export type MobileNavigationVariant =
    | 'tab-bar'            // Bottom tabs (iOS default)
    | 'bottom-nav'         // Bottom nav (Android M3)
    | 'nav-drawer'         // Hamburger drawer
    | 'nav-rail'           // Rail for tablets
    | 'floating-action';   // FAB + contextual menus

export type MobileChatVariant =
    | 'floating-bubble'    // Corner bubble
    | 'tab-integrated'     // Tab in bottom nav
    | 'full-screen'        // Full screen chat view
    | 'slide-up-sheet'     // Bottom sheet
    | 'hidden';            // Accessed via menu only

export type MobileCartVariant =
    | 'floating-button'    // Floating cart button
    | 'tab-badge'          // Badge on cart tab
    | 'slide-up-summary'   // Bottom sheet summary
    | 'full-screen';       // Dedicated cart screen

// Mobile-specific animations
export interface MobileAnimationConfig {
    // Transitions
    screenTransition: 'push' | 'modal' | 'fade' | 'shared-element' | 'none';
    listAnimation: 'none' | 'fade-in' | 'slide-up' | 'stagger';

    // Feedback
    tapFeedback: 'ripple' | 'highlight' | 'scale' | 'none'; // ripple = Android, highlight = iOS
    longPressFeedback: boolean;

    // Loading
    skeletonStyle: 'shimmer' | 'pulse' | 'fade';
    pullToRefreshStyle: 'default' | 'custom-lottie';

    // Haptics (iOS and modern Android)
    useHaptics: boolean;
    hapticIntensity: 'light' | 'medium' | 'heavy';
}

// Mobile Component Configuration
export interface MobileComponentConfig {
    productCard: MobileProductCardVariant;
    navigation: MobileNavigationVariant;
    chat: MobileChatVariant;
    cart: MobileCartVariant;

    // Specific component options
    usesSearchBar: boolean;         // Prominent search
    usesFiltersSheet: boolean;      // Filter bottom sheet
    usesCategoryChips: boolean;     // Horizontal chip scroll
    usesQuickAdd: boolean;          // Add to cart without modal
}

// ============================================
// MOBILE VIBE CONFIG
// ============================================

export interface MobileVibeConfig {
    id: string;
    orgId: string;
    name: string;
    description?: string;

    // Platform targeting
    platform: MobilePlatform;

    // AI Generation Context
    prompt: string;
    refinements?: string[];
    generatedAt: Date;
    generatedBy: 'ai' | 'manual' | 'template';

    // Core Theme (shared across platforms)
    theme: {
        colors: ColorPalette;
        typography: {
            ios: iOSConfig;
            android: AndroidConfig;
        };
    };

    // Platform-specific configs
    ios?: iOSConfig;
    android?: AndroidConfig;

    // App assets
    appIcon: AppIconConfig;
    splashScreen: SplashScreenConfig;
    pushNotifications: PushNotificationConfig;

    // Component Selections
    components: MobileComponentConfig;

    // Animations
    animations: MobileAnimationConfig;

    // Status
    status: 'draft' | 'published' | 'archived';
    publishedAt?: Date;
    version: number;

    // Linked web vibe (for consistent branding)
    linkedWebVibeId?: string;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}

// ============================================
// MOBILE GENERATION TYPES
// ============================================

export interface MobileVibeGenerationRequest {
    prompt: string;
    orgId: string;
    platform: MobilePlatform;
    linkedWebVibeId?: string;       // Inherit colors from web vibe
    currentConfig?: Partial<MobileVibeConfig>;
    style?: 'native' | 'branded' | 'playful' | 'minimal';
}

export interface MobileVibeGenerationResponse {
    success: boolean;
    config?: Partial<MobileVibeConfig>;
    reasoning?: string;
    iosNotes?: string;              // Platform-specific guidance
    androidNotes?: string;
    suggestions?: string[];
    error?: string;
}

// ============================================
// MOBILE PRESETS
// ============================================

export const MOBILE_VIBE_PRESETS: Record<string, Partial<MobileVibeConfig>> = {
    'native-clean': {
        name: 'Native Clean',
        description: 'Follows platform conventions with subtle branding',
        platform: 'both',
        ios: {
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
        },
        android: {
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
        },
        components: {
            productCard: 'large-grid',
            navigation: 'tab-bar',
            chat: 'floating-bubble',
            cart: 'tab-badge',
            usesSearchBar: true,
            usesFiltersSheet: true,
            usesCategoryChips: true,
            usesQuickAdd: false,
        },
        animations: {
            screenTransition: 'push',
            listAnimation: 'fade-in',
            tapFeedback: 'ripple',
            longPressFeedback: true,
            skeletonStyle: 'shimmer',
            pullToRefreshStyle: 'default',
            useHaptics: true,
            hapticIntensity: 'light',
        },
    },
    'bold-branded': {
        name: 'Bold Branded',
        description: 'Strong brand presence with custom styling',
        platform: 'both',
        ios: {
            font: 'custom',
            style: 'vibrant',
            blurStyle: 'dark',
            cornerRadius: 'rounded',
            usesVibrancy: true,
            usesMaterial: true,
            usesHaptics: true,
            navigationStyle: 'standard',
            tabBarStyle: 'opaque',
            statusBarStyle: 'light',
            widgetStyle: 'gradient',
            iconBackground: 'gradient',
        },
        android: {
            font: 'custom',
            usesDynamicColor: false,
            colorScheme: 'vibrant',
            surfaceTint: false,
            cornerFamily: 'rounded',
            cornerSize: 'large',
            usesSharedAxisTransition: true,
            usesPredictiveBack: true,
            navigationStyle: 'bottom-nav',
            topAppBarStyle: 'medium',
            statusBarStyle: 'edge-to-edge',
            iconForeground: 'logo',
            iconBackground: 'gradient',
            widgetShape: 'squircle',
        },
        components: {
            productCard: 'story-card',
            navigation: 'tab-bar',
            chat: 'slide-up-sheet',
            cart: 'floating-button',
            usesSearchBar: true,
            usesFiltersSheet: true,
            usesCategoryChips: true,
            usesQuickAdd: true,
        },
        animations: {
            screenTransition: 'shared-element',
            listAnimation: 'stagger',
            tapFeedback: 'scale',
            longPressFeedback: true,
            skeletonStyle: 'pulse',
            pullToRefreshStyle: 'custom-lottie',
            useHaptics: true,
            hapticIntensity: 'medium',
        },
    },
    'minimal-fast': {
        name: 'Minimal Fast',
        description: 'Performance-focused with minimal animations',
        platform: 'both',
        ios: {
            font: 'sf-pro',
            style: 'default',
            blurStyle: 'none',
            cornerRadius: 'system',
            usesVibrancy: false,
            usesMaterial: false,
            usesHaptics: false,
            navigationStyle: 'standard',
            tabBarStyle: 'opaque',
            statusBarStyle: 'default',
            widgetStyle: 'minimal',
            iconBackground: 'solid',
        },
        android: {
            font: 'roboto',
            usesDynamicColor: false,
            colorScheme: 'neutral',
            surfaceTint: false,
            cornerFamily: 'rounded',
            cornerSize: 'small',
            usesSharedAxisTransition: false,
            usesPredictiveBack: false,
            navigationStyle: 'bottom-nav',
            topAppBarStyle: 'small',
            statusBarStyle: 'default',
            iconForeground: 'logo-with-padding',
            iconBackground: 'solid',
            widgetShape: 'rounded-rectangle',
        },
        components: {
            productCard: 'list',
            navigation: 'tab-bar',
            chat: 'hidden',
            cart: 'tab-badge',
            usesSearchBar: true,
            usesFiltersSheet: false,
            usesCategoryChips: false,
            usesQuickAdd: true,
        },
        animations: {
            screenTransition: 'none',
            listAnimation: 'none',
            tapFeedback: 'highlight',
            longPressFeedback: false,
            skeletonStyle: 'fade',
            pullToRefreshStyle: 'default',
            useHaptics: false,
            hapticIntensity: 'light',
        },
    },
    'luxury-immersive': {
        name: 'Luxury Immersive',
        description: 'Premium experience with rich animations',
        platform: 'both',
        ios: {
            font: 'new-york',
            style: 'dark',
            blurStyle: 'prominent',
            cornerRadius: 'rounded',
            usesVibrancy: true,
            usesMaterial: true,
            usesHaptics: true,
            navigationStyle: 'hidden',
            tabBarStyle: 'translucent',
            statusBarStyle: 'light',
            widgetStyle: 'detailed',
            iconBackground: 'gradient',
        },
        android: {
            font: 'roboto-serif',
            usesDynamicColor: false,
            colorScheme: 'expressive',
            surfaceTint: true,
            cornerFamily: 'rounded',
            cornerSize: 'extra-large',
            usesSharedAxisTransition: true,
            usesPredictiveBack: true,
            navigationStyle: 'drawer',
            topAppBarStyle: 'center-aligned',
            statusBarStyle: 'edge-to-edge',
            iconForeground: 'logo',
            iconBackground: 'gradient',
            widgetShape: 'squircle',
        },
        components: {
            productCard: 'story-card',
            navigation: 'nav-drawer',
            chat: 'full-screen',
            cart: 'slide-up-summary',
            usesSearchBar: false,
            usesFiltersSheet: true,
            usesCategoryChips: false,
            usesQuickAdd: false,
        },
        animations: {
            screenTransition: 'shared-element',
            listAnimation: 'stagger',
            tapFeedback: 'scale',
            longPressFeedback: true,
            skeletonStyle: 'shimmer',
            pullToRefreshStyle: 'custom-lottie',
            useHaptics: true,
            hapticIntensity: 'heavy',
        },
    },
};

// ============================================
// MOBILE FONT OPTIONS
// ============================================

export const MOBILE_FONTS = {
    ios: {
        system: ['sf-pro', 'sf-pro-rounded', 'new-york'],
        display: ['SF Pro Display', 'New York'],
        text: ['SF Pro Text', 'SF Pro Rounded'],
    },
    android: {
        system: ['roboto', 'roboto-serif'],
        display: ['Roboto', 'Roboto Serif', 'Product Sans'],
        text: ['Roboto', 'Roboto Flex'],
    },
    custom: [
        // Custom fonts that work well on mobile
        'Inter', 'Poppins', 'Montserrat', 'Open Sans', 'Lato',
        'Nunito', 'DM Sans', 'Plus Jakarta Sans', 'Work Sans',
    ],
};
