/**
 * Style Presets Library
 *
 * Provides built-in and custom style presets for consistent brand imagery.
 * Presets include style prompts, color palettes, and typography preferences.
 */

import { StylePreset } from '@/types/media-generation';

/**
 * Built-in style presets for cannabis brands
 */
export const BUILT_IN_PRESETS: StylePreset[] = [
    {
        id: 'premium-luxury',
        name: 'Premium Luxury',
        description: 'Sophisticated, high-end aesthetic with gold accents and elegant typography',
        category: 'built-in',
        stylePrompt: 'luxury product photography, premium cannabis, gold accents, black background, elegant lighting, sophisticated, high-end, professional studio quality',
        negativePrompt: 'cheap, cluttered, busy, amateur, low quality',
        aspectRatios: ['1:1', '4:5', '16:9'],
        tags: ['luxury', 'premium', 'elegant', 'sophisticated'],
        colorPalette: {
            primary: '#1a1a1a',
            secondary: '#d4af37',
            accent: '#ffffff',
        },
        typography: {
            fontFamily: 'Playfair Display',
            fontSize: 'large',
            fontWeight: 'bold',
        },
        isPublic: true,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        id: 'organic-natural',
        name: 'Organic & Natural',
        description: 'Earthy tones, natural textures, and botanical elements',
        category: 'built-in',
        stylePrompt: 'organic cannabis, natural lighting, earthy tones, botanical, green leaves, wooden textures, sustainable, eco-friendly, natural hemp background',
        negativePrompt: 'synthetic, artificial, chemical, plastic, processed',
        aspectRatios: ['1:1', '4:5', '9:16'],
        tags: ['organic', 'natural', 'earthy', 'botanical', 'eco-friendly'],
        colorPalette: {
            primary: '#4a5a3f',
            secondary: '#8b7355',
            accent: '#a4c639',
        },
        typography: {
            fontFamily: 'Lora',
            fontSize: 'medium',
            fontWeight: 'normal',
        },
        isPublic: true,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        id: 'modern-minimal',
        name: 'Modern Minimal',
        description: 'Clean lines, white space, contemporary aesthetic',
        category: 'built-in',
        stylePrompt: 'minimalist design, clean white background, modern cannabis packaging, simple composition, negative space, contemporary, sleek, professional',
        negativePrompt: 'busy, cluttered, ornate, vintage, complex',
        aspectRatios: ['1:1', '9:16'],
        tags: ['minimal', 'modern', 'clean', 'contemporary'],
        colorPalette: {
            primary: '#ffffff',
            secondary: '#2c2c2c',
            accent: '#00c9a7',
        },
        typography: {
            fontFamily: 'Inter',
            fontSize: 'medium',
            fontWeight: 'light',
        },
        isPublic: true,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        id: 'vibrant-energetic',
        name: 'Vibrant & Energetic',
        description: 'Bold colors, dynamic composition, high energy visuals',
        category: 'built-in',
        stylePrompt: 'vibrant colors, energetic composition, bold cannabis branding, neon lights, dynamic angles, colorful smoke, modern pop art style, high contrast',
        negativePrompt: 'dull, muted, boring, static, monochrome',
        aspectRatios: ['1:1', '4:5', '16:9', '9:16'],
        tags: ['vibrant', 'energetic', 'bold', 'colorful', 'dynamic'],
        colorPalette: {
            primary: '#ff6b35',
            secondary: '#7b2cbf',
            accent: '#00f5ff',
        },
        typography: {
            fontFamily: 'Montserrat',
            fontSize: 'large',
            fontWeight: 'bold',
        },
        isPublic: true,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        id: 'vintage-retro',
        name: 'Vintage Retro',
        description: '70s-inspired aesthetic with warm tones and retro typography',
        category: 'built-in',
        stylePrompt: '1970s vintage aesthetic, retro cannabis poster, warm orange and brown tones, groovy typography, nostalgic, film grain, vintage photography',
        negativePrompt: 'modern, digital, sleek, futuristic',
        aspectRatios: ['4:5', '16:9'],
        tags: ['vintage', 'retro', '70s', 'nostalgic', 'warm'],
        colorPalette: {
            primary: '#d97642',
            secondary: '#8b4513',
            accent: '#f4a460',
        },
        typography: {
            fontFamily: 'Cooper',
            fontSize: 'large',
            fontWeight: 'bold',
        },
        isPublic: true,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        id: 'medical-clinical',
        name: 'Medical & Clinical',
        description: 'Professional, clinical aesthetic for medical cannabis',
        category: 'built-in',
        stylePrompt: 'medical cannabis, clinical setting, professional healthcare, white coat, laboratory, scientific, clean medical facility, trustworthy, pharmaceutical grade',
        negativePrompt: 'recreational, party, informal, unprofessional',
        aspectRatios: ['1:1', '16:9'],
        tags: ['medical', 'clinical', 'professional', 'scientific'],
        colorPalette: {
            primary: '#0066cc',
            secondary: '#ffffff',
            accent: '#00a86b',
        },
        typography: {
            fontFamily: 'Open Sans',
            fontSize: 'medium',
            fontWeight: 'normal',
        },
        isPublic: true,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        id: 'street-urban',
        name: 'Street & Urban',
        description: 'Gritty urban aesthetic with street art influences',
        category: 'built-in',
        stylePrompt: 'urban street art, graffiti aesthetic, city cannabis culture, brick wall background, street style, edgy, contemporary urban, skateboard culture',
        negativePrompt: 'corporate, formal, elegant, pristine',
        aspectRatios: ['1:1', '4:5', '9:16'],
        tags: ['urban', 'street', 'edgy', 'graffiti', 'culture'],
        colorPalette: {
            primary: '#1c1c1c',
            secondary: '#ff3131',
            accent: '#00ff00',
        },
        typography: {
            fontFamily: 'Bebas Neue',
            fontSize: 'large',
            fontWeight: 'bold',
        },
        isPublic: true,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        id: 'wellness-spa',
        name: 'Wellness & Spa',
        description: 'Calming, serene aesthetic focused on relaxation and wellness',
        category: 'built-in',
        stylePrompt: 'wellness spa aesthetic, calming cannabis products, serene setting, soft pastel colors, relaxation, mindfulness, zen garden, aromatherapy, tranquil',
        negativePrompt: 'energetic, busy, loud, harsh, intense',
        aspectRatios: ['1:1', '4:5'],
        tags: ['wellness', 'spa', 'calming', 'relaxation', 'zen'],
        colorPalette: {
            primary: '#e6f3ff',
            secondary: '#b8d4e8',
            accent: '#a8dadc',
        },
        typography: {
            fontFamily: 'Raleway',
            fontSize: 'medium',
            fontWeight: 'light',
        },
        isPublic: true,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
];

/**
 * Get all built-in presets
 */
export function getBuiltInPresets(): StylePreset[] {
    return BUILT_IN_PRESETS;
}

/**
 * Get a preset by ID (built-in or custom)
 */
export function getPresetById(presetId: string, customPresets: StylePreset[] = []): StylePreset | undefined {
    // Check built-in presets first
    const builtIn = BUILT_IN_PRESETS.find(p => p.id === presetId);
    if (builtIn) return builtIn;

    // Check custom presets
    return customPresets.find(p => p.id === presetId);
}

/**
 * Apply a style preset to a base prompt
 */
export function applyStylePreset(basePrompt: string, preset: StylePreset): {
    enhancedPrompt: string;
    negativePrompt?: string;
} {
    // Combine base prompt with style prompt
    const enhancedPrompt = `${basePrompt}, ${preset.stylePrompt}`;

    return {
        enhancedPrompt,
        negativePrompt: preset.negativePrompt,
    };
}

/**
 * Get presets by tags
 */
export function getPresetsByTags(tags: string[], customPresets: StylePreset[] = []): StylePreset[] {
    const allPresets = [...BUILT_IN_PRESETS, ...customPresets];

    return allPresets.filter(preset =>
        tags.some(tag => preset.tags.includes(tag.toLowerCase()))
    );
}

/**
 * Get recommended presets based on product type or keywords
 */
export function getRecommendedPresets(keywords: string): StylePreset[] {
    const lowerKeywords = keywords.toLowerCase();

    // Keyword to preset mapping
    if (lowerKeywords.includes('medical') || lowerKeywords.includes('clinical')) {
        return [
            BUILT_IN_PRESETS.find(p => p.id === 'medical-clinical')!,
            BUILT_IN_PRESETS.find(p => p.id === 'wellness-spa')!,
        ];
    }

    if (lowerKeywords.includes('luxury') || lowerKeywords.includes('premium')) {
        return [
            BUILT_IN_PRESETS.find(p => p.id === 'premium-luxury')!,
            BUILT_IN_PRESETS.find(p => p.id === 'modern-minimal')!,
        ];
    }

    if (lowerKeywords.includes('organic') || lowerKeywords.includes('natural')) {
        return [
            BUILT_IN_PRESETS.find(p => p.id === 'organic-natural')!,
            BUILT_IN_PRESETS.find(p => p.id === 'wellness-spa')!,
        ];
    }

    if (lowerKeywords.includes('edgy') || lowerKeywords.includes('urban')) {
        return [
            BUILT_IN_PRESETS.find(p => p.id === 'street-urban')!,
            BUILT_IN_PRESETS.find(p => p.id === 'vibrant-energetic')!,
        ];
    }

    // Default recommendations
    return [
        BUILT_IN_PRESETS.find(p => p.id === 'modern-minimal')!,
        BUILT_IN_PRESETS.find(p => p.id === 'organic-natural')!,
        BUILT_IN_PRESETS.find(p => p.id === 'vibrant-energetic')!,
    ];
}
