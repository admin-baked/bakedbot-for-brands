/**
 * Bundle Preview Visibility Tests
 *
 * Comprehensive tests for the preview card feature that displays created bundles
 * immediately after generation in both dashboard and inbox contexts.
 */

describe('Bundle Preview Visibility Feature', () => {
    describe('BundlePreview Component', () => {
        it('component exists and exports correctly', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/dashboard/bundles/bundle-preview.tsx'
            );
            expect(fs.existsSync(componentPath)).toBe(true);

            const content = fs.readFileSync(componentPath, 'utf-8');
            expect(content).toContain('export function BundlePreview');
        });

        it('component displays bundle metrics (products, pricing, savings)', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/dashboard/bundles/bundle-preview.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Verify metrics display
            expect(content).toContain('Products');
            expect(content).toContain('Original');
            expect(content).toContain('Bundle Price');
            expect(content).toContain('Savings');
        });

        it('component includes Edit and Create Another buttons', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/dashboard/bundles/bundle-preview.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            expect(content).toContain('onEdit');
            expect(content).toContain('onCreateAnother');
            expect(content).toContain('Edit');
            expect(content).toContain('Create Another');
        });

        it('component uses green styling for success context', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/dashboard/bundles/bundle-preview.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            expect(content).toContain('bg-green');
            expect(content).toContain('border-green');
        });

        it('component accepts showActions prop to conditionally render buttons', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/dashboard/bundles/bundle-preview.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            expect(content).toContain('showActions');
            expect(content).toContain('showActions = true');
        });
    });

    describe('BundleRuleBuilder Preview Integration', () => {
        it('imports BundlePreview component', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/dashboard/bundles/bundle-rule-builder.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            expect(content).toContain(
                "import { BundlePreview } from './bundle-preview'"
            );
        });

        it('has lastCreatedBundle state for preview data', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/dashboard/bundles/bundle-rule-builder.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            expect(content).toContain('lastCreatedBundle');
            expect(content).toContain('setLastCreatedBundle');
        });

        it('has showCreatedPreview state for visibility toggle', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/dashboard/bundles/bundle-rule-builder.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            expect(content).toContain('showCreatedPreview');
            expect(content).toContain('setShowCreatedPreview');
        });

        it('sets preview state on successful bundle creation', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/dashboard/bundles/bundle-rule-builder.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // handleAcceptSuggestion should update preview state
            expect(content).toContain('setLastCreatedBundle(result.data)');
            expect(content).toContain('setShowCreatedPreview(true)');
        });

        it('renders BundlePreview conditionally when bundle is created', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/dashboard/bundles/bundle-rule-builder.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Verify conditional rendering
            expect(content).toContain('showCreatedPreview && lastCreatedBundle');
            expect(content).toContain('<BundlePreview');
        });

        it('Edit button hides preview in BundleRuleBuilder', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/dashboard/bundles/bundle-rule-builder.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Verify onEdit handler
            expect(content).toContain('onEdit={() => {');
            expect(content).toContain('setShowCreatedPreview(false)');
        });

        it('Create Another button resets form state', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/dashboard/bundles/bundle-rule-builder.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Verify onCreateAnother handler
            expect(content).toContain('onCreateAnother={() => {');
            expect(content).toContain('setShowCreatedPreview(false)');
            expect(content).toContain('setSuggestions([])');
            expect(content).toContain("setRulePrompt('')");
        });
    });

    describe('BundleGeneratorInline Preview Integration', () => {
        it('imports BundlePreview component', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/bundle-generator-inline.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            expect(content).toContain(
                "import { BundlePreview } from '@/components/dashboard/bundles/bundle-preview'"
            );
        });

        it('has lastCreatedBundle state for preview data', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/bundle-generator-inline.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            expect(content).toContain('lastCreatedBundle');
            expect(content).toContain('setLastCreatedBundle');
        });

        it('has showCreatedPreview state for visibility toggle', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/bundle-generator-inline.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            expect(content).toContain('showCreatedPreview');
            expect(content).toContain('setShowCreatedPreview');
        });

        it('sets preview state on successful suggestion acceptance', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/bundle-generator-inline.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // handleAcceptSuggestion should update preview state
            expect(content).toContain('if (result.success && result.data)');
            expect(content).toContain('setLastCreatedBundle(result.data)');
            expect(content).toContain('setShowCreatedPreview(true)');
        });

        it('renders animated BundlePreview with motion.div', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/bundle-generator-inline.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Verify animated rendering
            expect(content).toContain('showCreatedPreview && lastCreatedBundle');
            expect(content).toContain('motion.div');
            expect(content).toContain('initial={{ opacity: 0, y: 10 }}');
            expect(content).toContain('animate={{ opacity: 1, y: 0 }}');
        });

        it('Create Another button resets form in inbox context', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/bundle-generator-inline.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Verify onCreateAnother handler resets form
            expect(content).toContain('onCreateAnother={() => {');
            expect(content).toContain('setShowCreatedPreview(false)');
            expect(content).toContain('setSuggestions([])');
            expect(content).toContain("setRulePrompt('')");
            expect(content).toContain("setName('')");
            expect(content).toContain("setDescription('')");
            expect(content).toContain('setSelectedProductIds([])');
        });
    });

    describe('Server Action Changes', () => {
        it('createBundleFromSuggestion returns bundle data', async () => {
            const fs = require('fs');
            const path = require('path');

            const actionPath = path.join(
                process.cwd(),
                'src/app/actions/bundle-suggestions.ts'
            );
            const content = fs.readFileSync(actionPath, 'utf-8');

            // Verify return type includes data
            expect(content).toContain('{ success: boolean; data?: BundleDeal; error?: string }');
            expect(content).toContain('return result');
        });
    });

    describe('UX/Pattern Consistency', () => {
        it('Bundle preview follows same pattern as Hero/Carousel', async () => {
            const fs = require('fs');
            const path = require('path');

            const bundlePath = path.join(
                process.cwd(),
                'src/components/dashboard/bundles/bundle-preview.tsx'
            );
            const bundleContent = fs.readFileSync(bundlePath, 'utf-8');

            // Check Hero for comparison
            const heroPath = path.join(
                process.cwd(),
                'src/components/dashboard/heroes/hero-preview.tsx'
            );
            const heroExists = fs.existsSync(heroPath);

            // Bundle should have same structure
            expect(bundleContent).toContain('export function BundlePreview');
            expect(bundleContent).toContain('interface BundlePreviewProps');

            // If Hero exists, verify both use similar patterns
            if (heroExists) {
                const heroContent = fs.readFileSync(heroPath, 'utf-8');
                expect(heroContent).toContain('export function HeroPreview');
                expect(heroContent).toContain('interface HeroPreviewProps');
            }
        });

        it('all three generators show preview after creation', async () => {
            const fs = require('fs');
            const path = require('path');

            const components = [
                'src/components/inbox/bundle-generator-inline.tsx',
                'src/components/inbox/hero-generator-inline.tsx',
                'src/components/inbox/carousel-generator-inline.tsx',
            ];

            for (const comp of components) {
                const componentPath = path.join(process.cwd(), comp);
                if (fs.existsSync(componentPath)) {
                    const content = fs.readFileSync(componentPath, 'utf-8');
                    // All should support showing created items
                    expect(content).toMatch(/lastCreated|Preview|preview/);
                }
            }
        });
    });

    describe('Feature Completeness', () => {
        it('preview displays after AI suggestion generation', async () => {
            const fs = require('fs');
            const path = require('path');

            const inlineComponentPath = path.join(
                process.cwd(),
                'src/components/inbox/bundle-generator-inline.tsx'
            );
            const inlineContent = fs.readFileSync(inlineComponentPath, 'utf-8');

            const dashboardComponentPath = path.join(
                process.cwd(),
                'src/components/dashboard/bundles/bundle-rule-builder.tsx'
            );
            const dashboardContent = fs.readFileSync(dashboardComponentPath, 'utf-8');

            // Both should handle preview after creation
            expect(inlineContent).toContain('setLastCreatedBundle');
            expect(dashboardContent).toContain('setLastCreatedBundle');
            expect(inlineContent).toContain('setShowCreatedPreview(true)');
            expect(dashboardContent).toContain('setShowCreatedPreview(true)');
        });

        it('preview displays after manual bundle creation', async () => {
            const fs = require('fs');
            const path = require('path');

            const inlineComponentPath = path.join(
                process.cwd(),
                'src/components/inbox/bundle-generator-inline.tsx'
            );
            const content = fs.readFileSync(inlineComponentPath, 'utf-8');

            // Manual builder creates bundles too
            expect(content).toContain('handleCreateManualBundle');
            // Should also set preview state
            expect(content).toContain('setLastCreatedBundle');
        });

        it('Edit button allows quick modifications', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/dashboard/bundles/bundle-preview.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Edit button should be present
            expect(content).toContain('Edit');
            expect(content).toContain('onEdit');
        });

        it('Create Another enables batch workflow', async () => {
            const fs = require('fs');
            const path = require('path');

            const bundleRuleBuilderPath = path.join(
                process.cwd(),
                'src/components/dashboard/bundles/bundle-rule-builder.tsx'
            );
            const bundleRuleContent = fs.readFileSync(bundleRuleBuilderPath, 'utf-8');

            const bundleGeneratorPath = path.join(
                process.cwd(),
                'src/components/inbox/bundle-generator-inline.tsx'
            );
            const bundleGeneratorContent = fs.readFileSync(bundleGeneratorPath, 'utf-8');

            // Both should have onCreateAnother handler (text appears in BundlePreview component)
            expect(bundleRuleContent).toContain('onCreateAnother');
            expect(bundleGeneratorContent).toContain('onCreateAnother');

            // Both should reset form state
            expect(bundleRuleContent).toContain("setRulePrompt('')");
            expect(bundleGeneratorContent).toContain("setRulePrompt('')");
        });
    });

    describe('No Regressions', () => {
        it('existing bundle creation flows still work', async () => {
            const fs = require('fs');
            const path = require('path');

            const bundlesPagePath = path.join(
                process.cwd(),
                'src/app/dashboard/bundles/page.tsx'
            );
            const pageContent = fs.readFileSync(bundlesPagePath, 'utf-8');

            // Page should still have bundle form sheet
            expect(pageContent).toContain('BundleForm');
            expect(pageContent).toContain('Sheet');
        });

        it('margin protection feature still works', async () => {
            const fs = require('fs');
            const path = require('path');

            const components = [
                'src/components/dashboard/bundles/bundle-rule-builder.tsx',
                'src/components/inbox/bundle-generator-inline.tsx',
            ];

            for (const comp of components) {
                const componentPath = path.join(process.cwd(), comp);
                const content = fs.readFileSync(componentPath, 'utf-8');

                expect(content).toContain('Margin Protection Active');
                expect(content).toContain('minMargin');
            }
        });

        it('smart presets still load', async () => {
            const fs = require('fs');
            const path = require('path');

            const components = [
                'src/components/dashboard/bundles/bundle-rule-builder.tsx',
                'src/components/inbox/bundle-generator-inline.tsx',
            ];

            for (const comp of components) {
                const componentPath = path.join(process.cwd(), comp);
                const content = fs.readFileSync(componentPath, 'utf-8');

                expect(content).toContain('Smart Presets');
                expect(content).toContain('getSmartPresets');
            }
        });
    });
});
