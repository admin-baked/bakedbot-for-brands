/**
 * Architecture checks for LaunchCoordinatorInline integration in InboxConversation.
 */

describe('InboxConversation - LaunchCoordinatorInline Integration', () => {
    it('imports LaunchCoordinatorInline from the inbox components folder', async () => {
        const fs = require('fs');
        const path = require('path');

        const componentPath = path.join(
            process.cwd(),
            'src/components/inbox/inbox-conversation.tsx'
        );
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain(
            "import { LaunchCoordinatorInline } from './launch-coordinator-inline'"
        );
    });

    it('tracks launch-specific state and prompt wiring', async () => {
        const fs = require('fs');
        const path = require('path');

        const componentPath = path.join(
            process.cwd(),
            'src/components/inbox/inbox-conversation.tsx'
        );
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain('showLaunchCoordinator');
        expect(content).toContain('launchInitialPrompt');
        expect(content).toContain('handleOpenLaunchAsset');
    });

    it('auto-opens the launch coordinator for launch threads', async () => {
        const fs = require('fs');
        const path = require('path');

        const componentPath = path.join(
            process.cwd(),
            'src/components/inbox/inbox-conversation.tsx'
        );
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain("case 'launch':");
        expect(content).toContain("case 'launch_campaign':");
        expect(content).toContain("if (thread.type === 'launch' || thread.type === 'launch_campaign')");
        expect(content).toContain('setShowLaunchCoordinator(true)');
    });

    it('renders LaunchCoordinatorInline with orgId, initialPrompt, and asset callback', async () => {
        const fs = require('fs');
        const path = require('path');

        const componentPath = path.join(
            process.cwd(),
            'src/components/inbox/inbox-conversation.tsx'
        );
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain('<LaunchCoordinatorInline');
        expect(content).toContain('orgId={thread.orgId}');
        expect(content).toContain('initialPrompt={launchInitialPrompt}');
        expect(content).toContain('onOpenAsset={handleOpenLaunchAsset}');
    });
});
