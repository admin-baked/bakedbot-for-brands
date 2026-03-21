describe('InboxConversation - CrmCampaignInline Integration', () => {
    it('imports CrmCampaignInline from the inbox components folder', async () => {
        const fs = require('fs');
        const path = require('path');

        const componentPath = path.join(
            process.cwd(),
            'src/components/inbox/inbox-conversation.tsx'
        );
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain(
            "import { CrmCampaignInline } from './crm-campaign-inline'"
        );
    });

    it('tracks CRM-specific state and prompt wiring', async () => {
        const fs = require('fs');
        const path = require('path');

        const componentPath = path.join(
            process.cwd(),
            'src/components/inbox/inbox-conversation.tsx'
        );
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain('showCrmCoordinator');
        expect(content).toContain('crmInitialPrompt');
        expect(content).toContain('handleOpenCrmAction');
    });

    it('auto-opens the CRM coordinator for crm_customer threads', async () => {
        const fs = require('fs');
        const path = require('path');

        const componentPath = path.join(
            process.cwd(),
            'src/components/inbox/inbox-conversation.tsx'
        );
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain("case 'crm_customer':");
        expect(content).toContain("if (thread.type === 'crm_customer')");
        expect(content).toContain('setShowCrmCoordinator(true)');
    });

    it('does not hijack general chat messages with CRM keywords', async () => {
        const fs = require('fs');
        const path = require('path');

        const componentPath = path.join(
            process.cwd(),
            'src/components/inbox/inbox-conversation.tsx'
        );
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain("if (thread.type === 'crm_customer' && isCrmRequest)");
    });

    it('renders CrmCampaignInline with org and CRM context props', async () => {
        const fs = require('fs');
        const path = require('path');

        const componentPath = path.join(
            process.cwd(),
            'src/components/inbox/inbox-conversation.tsx'
        );
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain('<CrmCampaignInline');
        expect(content).toContain('orgId={thread.orgId}');
        expect(content).toContain('customerId={thread.customerId}');
        expect(content).toContain('customerEmail={thread.customerEmail}');
        expect(content).toContain('onOpenAction={handleOpenCrmAction}');
    });
});
