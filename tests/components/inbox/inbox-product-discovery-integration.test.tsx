describe('InboxConversation - ProductDiscoveryInline Integration', () => {
    it('imports ProductDiscoveryInline from the inbox components folder', async () => {
        const fs = require('fs');
        const path = require('path');

        const componentPath = path.join(
            process.cwd(),
            'src/components/inbox/inbox-conversation.tsx'
        );
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain(
            "import { ProductDiscoveryInline } from './product-discovery-inline'"
        );
    });

    it('tracks product discovery state and prompt wiring', async () => {
        const fs = require('fs');
        const path = require('path');

        const componentPath = path.join(
            process.cwd(),
            'src/components/inbox/inbox-conversation.tsx'
        );
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain('showProductDiscovery');
        expect(content).toContain('productDiscoveryInitialPrompt');
        expect(content).toContain('handleOpenProductDiscoveryAction');
    });

    it('auto-opens the coordinator for product_discovery threads', async () => {
        const fs = require('fs');
        const path = require('path');

        const componentPath = path.join(
            process.cwd(),
            'src/components/inbox/inbox-conversation.tsx'
        );
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain("case 'product_discovery':");
        expect(content).toContain("if (thread.type === 'product_discovery')");
        expect(content).toContain('setShowProductDiscovery(true)');
    });

    it('renders ProductDiscoveryInline with orgId, initialPrompt, and action callback', async () => {
        const fs = require('fs');
        const path = require('path');

        const componentPath = path.join(
            process.cwd(),
            'src/components/inbox/inbox-conversation.tsx'
        );
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain('<ProductDiscoveryInline');
        expect(content).toContain('orgId={thread.orgId}');
        expect(content).toContain('initialPrompt={productDiscoveryInitialPrompt}');
        expect(content).toContain('onOpenAction={handleOpenProductDiscoveryAction}');
    });
});
