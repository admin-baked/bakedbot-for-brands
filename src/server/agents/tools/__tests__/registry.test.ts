
import { getToolDefinition, TOOL_REGISTRY } from '../registry';

describe('Tool Registry', () => {
    describe('getToolDefinition', () => {
        it('should return definition for valid tool name', () => {
            const def = getToolDefinition('catalog.searchProducts');
            expect(def).toBeDefined();
            expect(def?.name).toBe('catalog.searchProducts');
            expect(def?.category).toBe('read');
        });

        it('should return undefined for unknown tool', () => {
            const def = getToolDefinition('nonexistent.tool');
            expect(def).toBeUndefined();
        });

        it('should include required fields in all tool definitions', () => {
            Object.values(TOOL_REGISTRY).forEach(def => {
                expect(def.name).toBeDefined();
                expect(def.description).toBeDefined();
                expect(def.inputSchema).toBeDefined();
            });
        });
    });

    describe('Registry Contents', () => {
        it('should contain catalog tools', () => {
            expect(getToolDefinition('catalog.searchProducts')).toBeDefined();
            expect(getToolDefinition('catalog.getProduct')).toBeDefined();
        });

        it('should contain marketing tools', () => {
            expect(getToolDefinition('marketing.createCampaignDraft')).toBeDefined();
            expect(getToolDefinition('marketing.send')).toBeDefined();
            expect(getToolDefinition('marketing.sendEmail')).toBeDefined();
        });

        it('marketing.sendEmail should have correct properties', () => {
            const def = getToolDefinition('marketing.sendEmail');
            expect(def).toBeDefined();
            expect(def?.category).toBe('write');
            expect(def?.requiredPermission).toBe('manage:campaigns');
            expect(def?.inputSchema?.required).toContain('to');
            expect(def?.inputSchema?.required).toContain('subject');
            expect(def?.inputSchema?.required).toContain('content');
        });

        it('should contain analytics tools', () => {
            expect(getToolDefinition('analytics.getKPIs')).toBeDefined();
        });

        it('should contain intel tools', () => {
            expect(getToolDefinition('intel.scanCompetitors')).toBeDefined();
        });

        it('should contain universal tools', () => {
            expect(getToolDefinition('context.getTenantProfile')).toBeDefined();
            expect(getToolDefinition('audit.log')).toBeDefined();
        });
    });

    describe('Tool Categories', () => {
        it('marketing.send should be categorized as side-effect', () => {
            const def = getToolDefinition('marketing.send');
            expect(def?.category).toBe('side-effect');
        });

        it('catalog.searchProducts should be categorized as read', () => {
            const def = getToolDefinition('catalog.searchProducts');
            expect(def?.category).toBe('read');
        });
    });
});
