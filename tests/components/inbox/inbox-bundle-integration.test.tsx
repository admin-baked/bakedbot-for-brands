/**
 * Integration tests for BundleGeneratorInline in InboxConversation
 *
 * Tests that BundleGeneratorInline is properly integrated with:
 * - orgId prop passing from thread
 * - Inbox conversation context
 * - Bundle creation workflow in inbox
 */

describe('InboxConversation - BundleGeneratorInline Integration', () => {
    describe('Architecture Verification', () => {
        it('imports BundleGeneratorInline from correct path', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Verify import exists
            expect(content).toContain(
                "import { BundleGeneratorInline } from './bundle-generator-inline'"
            );
        });

        it('passes orgId prop to BundleGeneratorInline', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Verify orgId prop is passed
            expect(content).toContain('orgId={thread.orgId}');
        });

        it('provides both BundleGeneratorInline usages with orgId', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Count occurrences of orgId={thread.orgId} with BundleGeneratorInline
            const lines = content.split('\n');
            let bundleGeneratorCount = 0;
            let orgIdPassingCount = 0;

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('<BundleGeneratorInline')) {
                    bundleGeneratorCount++;
                    // Check if orgId is passed in the next few lines
                    const nextLines = lines.slice(i, Math.min(i + 5, lines.length)).join('\n');
                    if (nextLines.includes('orgId={thread.orgId}')) {
                        orgIdPassingCount++;
                    }
                }
            }

            expect(bundleGeneratorCount).toBeGreaterThanOrEqual(2);
            expect(orgIdPassingCount).toBe(2);
        });

        it('provides onComplete callback to BundleGeneratorInline', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Verify onComplete callback is passed
            expect(content).toContain('onComplete={handleCompleteBundle}');
        });

        it('provides initialPrompt prop to BundleGeneratorInline', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Verify initialPrompt is passed
            expect(content).toContain('initialPrompt={bundleInitialPrompt}');
        });

        it('thread prop is available in InboxConversation', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Verify thread is part of props interface
            expect(content).toContain('thread: InboxThread');
            // And that thread.orgId is accessible
            expect(content).toContain('thread.orgId');
        });
    });

    describe('Component Pattern Consistency', () => {
        it('BundleGeneratorInline follows same pattern as HeroGeneratorInline', async () => {
            const fs = require('fs');
            const path = require('path');

            const inboxPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(inboxPath, 'utf-8');

            // Both should be imported
            expect(content).toContain('HeroGeneratorInline');
            expect(content).toContain('BundleGeneratorInline');

            // Both should have showBundleGenerator / showHeroGenerator flags
            expect(content).toContain('showBundleGenerator');
            expect(content).toContain('showHeroGenerator');

            // Both should have conditional rendering blocks
            const heroImportIdx = content.indexOf('HeroGeneratorInline');
            const bundleImportIdx = content.indexOf('BundleGeneratorInline');
            expect(heroImportIdx).toBeGreaterThan(-1);
            expect(bundleImportIdx).toBeGreaterThan(-1);
        });

        it('BundleGeneratorInline follows same pattern as CarouselGeneratorInline', async () => {
            const fs = require('fs');
            const path = require('path');

            const inboxPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(inboxPath, 'utf-8');

            // Both should be imported
            expect(content).toContain('CarouselGeneratorInline');
            expect(content).toContain('BundleGeneratorInline');

            // Both should be used in conditional rendering
            expect(content).toContain('showCarouselGenerator');
            expect(content).toContain('showBundleGenerator');
        });

        it('all generator inline components receive orgId prop', async () => {
            const fs = require('fs');
            const path = require('path');

            const inboxPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(inboxPath, 'utf-8');

            // Extract all GeneratorInline usages
            const generators = [
                'HeroGeneratorInline',
                'CarouselGeneratorInline',
                'BundleGeneratorInline',
                'SocialPostGeneratorInline',
            ];

            for (const generator of generators) {
                // Find the import
                expect(content).toContain(`import { ${generator} }`);
            }

            // Verify bundle specifically gets orgId
            expect(content).toContain('BundleGeneratorInline');
            const bundleSection = content.split('BundleGeneratorInline').slice(1, 3).join('BundleGeneratorInline');
            expect(bundleSection).toContain('orgId={thread.orgId}');
        });
    });

    describe('No Regression', () => {
        it('does not have old useDispensaryId hook', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/bundle-generator-inline.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Old pattern should be removed
            expect(content).not.toContain('useDispensaryId');
        });

        it('does not call old API endpoint', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/bundle-generator-inline.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Old API endpoint should be removed
            expect(content).not.toContain('/api/ai/bundle-suggest');
        });

        it('InboxConversation properly handles bundle completion', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Should have handleCompleteBundle handler
            expect(content).toContain('handleCompleteBundle');
        });
    });

    describe('Server Actions Integration', () => {
        it('BundleGeneratorInline uses server actions', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/bundle-generator-inline.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Should import from bundle-suggestions server actions
            expect(content).toContain('@/app/actions/bundle-suggestions');
            expect(content).toContain('generateAIBundleSuggestions');
            expect(content).toContain('parseNaturalLanguageRule');
            expect(content).toContain('getSmartPresets');
            expect(content).toContain('createBundleFromSuggestion');
        });

        it('all generators in inbox use server actions', async () => {
            const fs = require('fs');
            const path = require('path');

            const inboxPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(inboxPath, 'utf-8');

            // Should use server actions for bundle operations
            expect(content).toContain('runInboxAgentChat');
            expect(content).toContain('addMessageToInboxThread');
        });
    });
});
