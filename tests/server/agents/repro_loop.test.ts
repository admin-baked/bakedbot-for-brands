/**
 * Simple verification that Linus is mapped to linusAgent
 * 
 * This test directly checks the agent mapping without invoking the full runner.
 */

describe('Agent Mapping Fix Verification', () => {
    it('should import linusAgent in actions.ts', async () => {
        // Read the actions.ts file and verify it imports linusAgent
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const actionsPath = path.join(process.cwd(), 'src/app/dashboard/ceo/agents/actions.ts');
        const content = await fs.readFile(actionsPath, 'utf-8');
        
        // Verify linusAgent is imported
        expect(content).toContain("import { linusAgent } from '@/server/agents/linus'");
        
        // Verify AGENT_MAP uses linusAgent for linus
        expect(content).toContain('linus: linusAgent');
        
        // Verify it's NOT using executiveAgent for linus anymore
        expect(content).not.toMatch(/linus:\s*executiveAgent/);
    });

    it('linusAgent should have agentName "linus"', async () => {
        // This verifies the linusAgent implementation exists and has correct name
        const { linusAgent } = await import('@/server/agents/linus');
        
        expect(linusAgent).toBeDefined();
        expect(linusAgent.agentName).toBe('linus');
    });
});
