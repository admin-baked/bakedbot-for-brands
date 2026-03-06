describe('InboxConversation - WholesaleInventoryInline Integration', () => {
    it('imports WholesaleInventoryInline from the inbox components folder', async () => {
        const fs = require('fs');
        const path = require('path');

        const componentPath = path.join(
            process.cwd(),
            'src/components/inbox/inbox-conversation.tsx'
        );
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain(
            "import { WholesaleInventoryInline } from './wholesale-inventory-inline'"
        );
    });

    it('tracks wholesale inventory state and prompt wiring', async () => {
        const fs = require('fs');
        const path = require('path');

        const componentPath = path.join(
            process.cwd(),
            'src/components/inbox/inbox-conversation.tsx'
        );
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain('showWholesaleInventory');
        expect(content).toContain('wholesaleInventoryInitialPrompt');
        expect(content).toContain('handleOpenWholesaleInventoryAction');
    });

    it('auto-opens the coordinator for wholesale_inventory threads', async () => {
        const fs = require('fs');
        const path = require('path');

        const componentPath = path.join(
            process.cwd(),
            'src/components/inbox/inbox-conversation.tsx'
        );
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain("case 'wholesale_inventory':");
        expect(content).toContain("if (thread.type === 'wholesale_inventory')");
        expect(content).toContain('setShowWholesaleInventory(true)');
    });

    it('renders WholesaleInventoryInline with orgId, initialPrompt, and action callback', async () => {
        const fs = require('fs');
        const path = require('path');

        const componentPath = path.join(
            process.cwd(),
            'src/components/inbox/inbox-conversation.tsx'
        );
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain('<WholesaleInventoryInline');
        expect(content).toContain('orgId={thread.orgId}');
        expect(content).toContain('initialPrompt={wholesaleInventoryInitialPrompt}');
        expect(content).toContain('onOpenAction={handleOpenWholesaleInventoryAction}');
    });
});
