/**
 * Tests for Vibe Types
 */

import {
    MOBILE_VIBE_PRESETS,
    VIBE_PRESETS,
    type MobileVibeConfig,
    type VibeConfig,
    type MobilePlatform,
} from '../vibe';

describe('Vibe Types', () => {
    describe('VIBE_PRESETS', () => {
        it('should have all required web presets', () => {
            const presetKeys = Object.keys(VIBE_PRESETS);
            expect(presetKeys).toContain('modern-clean');
            expect(presetKeys).toContain('dark-luxury');
            expect(presetKeys).toContain('cyberpunk');
            expect(presetKeys).toContain('organic-natural');
            expect(presetKeys).toContain('bold-street');
        });

        it('should have valid theme colors for each preset', () => {
            Object.entries(VIBE_PRESETS).forEach(([key, preset]) => {
                expect(preset.theme?.colors).toBeDefined();
                expect(preset.theme?.colors?.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
                expect(preset.theme?.colors?.secondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
                expect(preset.theme?.colors?.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
            });
        });

        it('should have valid typography config for each preset', () => {
            Object.entries(VIBE_PRESETS).forEach(([key, preset]) => {
                expect(preset.theme?.typography).toBeDefined();
                expect(preset.theme?.typography?.headingFont).toBeTruthy();
                expect(preset.theme?.typography?.bodyFont).toBeTruthy();
                expect(preset.theme?.typography?.headingWeight).toBeGreaterThanOrEqual(400);
                expect(preset.theme?.typography?.headingWeight).toBeLessThanOrEqual(900);
            });
        });

        it('should have valid component config for each preset', () => {
            Object.entries(VIBE_PRESETS).forEach(([key, preset]) => {
                expect(preset.components).toBeDefined();
                expect(preset.components?.hero).toBeTruthy();
                expect(preset.components?.productCard).toBeTruthy();
                expect(preset.components?.navigation).toBeTruthy();
                expect(preset.components?.chatbot).toBeTruthy();
            });
        });
    });

    describe('MOBILE_VIBE_PRESETS', () => {
        it('should have all required mobile presets', () => {
            const presetKeys = Object.keys(MOBILE_VIBE_PRESETS);
            expect(presetKeys).toContain('native-clean');
            expect(presetKeys).toContain('bold-branded');
            expect(presetKeys).toContain('minimal-fast');
            expect(presetKeys).toContain('luxury-immersive');
        });

        it('should have valid iOS config for each preset', () => {
            Object.entries(MOBILE_VIBE_PRESETS).forEach(([key, preset]) => {
                expect(preset.ios).toBeDefined();
                expect(preset.ios?.font).toBeTruthy();
                expect(preset.ios?.navigationStyle).toBeTruthy();
                expect(preset.ios?.tabBarStyle).toBeTruthy();
                expect(typeof preset.ios?.usesHaptics).toBe('boolean');
            });
        });

        it('should have valid Android config for each preset', () => {
            Object.entries(MOBILE_VIBE_PRESETS).forEach(([key, preset]) => {
                expect(preset.android).toBeDefined();
                expect(preset.android?.font).toBeTruthy();
                expect(preset.android?.navigationStyle).toBeTruthy();
                expect(preset.android?.colorScheme).toBeTruthy();
                expect(typeof preset.android?.usesDynamicColor).toBe('boolean');
            });
        });

        it('should have valid component config for mobile presets', () => {
            Object.entries(MOBILE_VIBE_PRESETS).forEach(([key, preset]) => {
                expect(preset.components).toBeDefined();
                expect(preset.components?.productCard).toBeTruthy();
                expect(preset.components?.navigation).toBeTruthy();
                expect(preset.components?.chat).toBeTruthy();
                expect(preset.components?.cart).toBeTruthy();
            });
        });

        it('should have valid animation config for mobile presets', () => {
            Object.entries(MOBILE_VIBE_PRESETS).forEach(([key, preset]) => {
                expect(preset.animations).toBeDefined();
                expect(preset.animations?.screenTransition).toBeTruthy();
                expect(preset.animations?.tapFeedback).toBeTruthy();
                expect(typeof preset.animations?.useHaptics).toBe('boolean');
            });
        });

        it('should have platform targeting for each preset', () => {
            Object.entries(MOBILE_VIBE_PRESETS).forEach(([key, preset]) => {
                expect(preset.platform).toBeTruthy();
                expect(['ios', 'android', 'both']).toContain(preset.platform);
            });
        });
    });

    describe('Platform-specific configurations', () => {
        it('native-clean preset should use platform defaults', () => {
            const nativeClean = MOBILE_VIBE_PRESETS['native-clean'];
            expect(nativeClean.platform).toBe('both');
            expect(nativeClean.ios?.font).toBe('sf-pro');
            expect(nativeClean.android?.font).toBe('roboto');
            expect(nativeClean.android?.usesDynamicColor).toBe(true);
        });

        it('bold-branded preset should disable dynamic colors', () => {
            const boldBranded = MOBILE_VIBE_PRESETS['bold-branded'];
            expect(boldBranded.android?.usesDynamicColor).toBe(false);
            expect(boldBranded.ios?.font).toBe('custom');
        });

        it('minimal-fast preset should minimize animations', () => {
            const minimalFast = MOBILE_VIBE_PRESETS['minimal-fast'];
            expect(minimalFast.animations?.screenTransition).toBe('none');
            expect(minimalFast.animations?.listAnimation).toBe('none');
            expect(minimalFast.animations?.useHaptics).toBe(false);
            expect(minimalFast.ios?.usesVibrancy).toBe(false);
        });

        it('luxury-immersive preset should maximize effects', () => {
            const luxury = MOBILE_VIBE_PRESETS['luxury-immersive'];
            expect(luxury.animations?.screenTransition).toBe('shared-element');
            expect(luxury.animations?.hapticIntensity).toBe('heavy');
            expect(luxury.ios?.usesVibrancy).toBe(true);
            expect(luxury.ios?.blurStyle).toBe('prominent');
        });
    });

    describe('Type safety', () => {
        it('should enforce MobilePlatform type', () => {
            const validPlatforms: MobilePlatform[] = ['ios', 'android', 'both'];
            validPlatforms.forEach(platform => {
                expect(['ios', 'android', 'both']).toContain(platform);
            });
        });

        it('should have consistent iOS font options', () => {
            const validFonts = ['sf-pro', 'sf-pro-rounded', 'new-york', 'custom'];
            Object.values(MOBILE_VIBE_PRESETS).forEach(preset => {
                if (preset.ios?.font) {
                    expect(validFonts).toContain(preset.ios.font);
                }
            });
        });

        it('should have consistent Android font options', () => {
            const validFonts = ['roboto', 'roboto-serif', 'custom'];
            Object.values(MOBILE_VIBE_PRESETS).forEach(preset => {
                if (preset.android?.font) {
                    expect(validFonts).toContain(preset.android.font);
                }
            });
        });
    });

    describe('Preset completeness', () => {
        it('all mobile presets should have iOS config when platform is ios or both', () => {
            Object.entries(MOBILE_VIBE_PRESETS).forEach(([key, preset]) => {
                if (preset.platform === 'ios' || preset.platform === 'both') {
                    expect(preset.ios).toBeDefined();
                    expect(preset.ios?.font).toBeTruthy();
                    expect(preset.ios?.navigationStyle).toBeTruthy();
                }
            });
        });

        it('all mobile presets should have Android config when platform is android or both', () => {
            Object.entries(MOBILE_VIBE_PRESETS).forEach(([key, preset]) => {
                if (preset.platform === 'android' || preset.platform === 'both') {
                    expect(preset.android).toBeDefined();
                    expect(preset.android?.font).toBeTruthy();
                    expect(preset.android?.navigationStyle).toBeTruthy();
                }
            });
        });

        it('all presets should have animations config', () => {
            Object.values(MOBILE_VIBE_PRESETS).forEach(preset => {
                expect(preset.animations).toBeDefined();
                expect(preset.animations?.screenTransition).toBeTruthy();
                expect(preset.animations?.tapFeedback).toBeTruthy();
            });
        });

        it('all presets should have components config', () => {
            Object.values(MOBILE_VIBE_PRESETS).forEach(preset => {
                expect(preset.components).toBeDefined();
                expect(preset.components?.productCard).toBeTruthy();
                expect(preset.components?.navigation).toBeTruthy();
                expect(preset.components?.chat).toBeTruthy();
                expect(preset.components?.cart).toBeTruthy();
            });
        });
    });
});
