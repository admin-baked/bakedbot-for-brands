/**
 * Unit Tests: Role-Based Chat Configuration
 * 
 * Tests for role-based chat configurations and utilities.
 */

import {
    getChatConfigForRole,
    getAllChatConfigs,
    EDITOR_CHAT_CONFIG,
    CUSTOMER_CHAT_CONFIG,
    BRAND_CHAT_CONFIG,
    DISPENSARY_CHAT_CONFIG,
    OWNER_CHAT_CONFIG,
    type UserRoleForChat,
    type RoleChatConfig
} from '@/lib/chat/role-chat-config';

describe('Role Chat Configuration', () => {
    describe('getChatConfigForRole', () => {
        it('should return editor config for editor role', () => {
            const config = getChatConfigForRole('editor');

            expect(config.role).toBe('editor');
            expect(config.title).toBe('Content Assistant');
            expect(config.agentPersona).toBe('deebo');
        });

        it('should return customer config for customer role', () => {
            const config = getChatConfigForRole('customer');

            expect(config.role).toBe('customer');
            expect(config.title).toBe('Cannabis Concierge');
            expect(config.agentPersona).toBe('smokey');
        });

        it('should return brand config for brand role', () => {
            const config = getChatConfigForRole('brand');

            expect(config.role).toBe('brand');
            expect(config.agentPersona).toBe('craig');
        });

        it('should return dispensary config for dispensary role', () => {
            const config = getChatConfigForRole('dispensary');

            expect(config.role).toBe('dispensary');
            expect(config.agentPersona).toBe('money_mike');
        });

        it('should return owner config for owner role', () => {
            const config = getChatConfigForRole('owner');

            expect(config.role).toBe('owner');
            expect(config.enabledFeatures.modelSelector).toBe(true);
        });

        it('should return owner config for admin role', () => {
            const config = getChatConfigForRole('admin');

            // Admin uses owner config as base
            expect(config.enabledFeatures.modelSelector).toBe(true);
        });
    });

    describe('getAllChatConfigs', () => {
        it('should return configs for all roles', () => {
            const configs = getAllChatConfigs();

            expect(Object.keys(configs)).toHaveLength(6);
            expect(configs.owner).toBeDefined();
            expect(configs.admin).toBeDefined();
            expect(configs.brand).toBeDefined();
            expect(configs.dispensary).toBeDefined();
            expect(configs.editor).toBeDefined();
            expect(configs.customer).toBeDefined();
        });
    });

    describe('EDITOR_CHAT_CONFIG', () => {
        it('should have correct prompt suggestions', () => {
            expect(EDITOR_CHAT_CONFIG.promptSuggestions.length).toBeGreaterThan(0);
            expect(EDITOR_CHAT_CONFIG.promptSuggestions.some(s =>
                s.toLowerCase().includes('seo')
            )).toBe(true);
        });

        it('should have restricted tools for editors', () => {
            expect(EDITOR_CHAT_CONFIG.restrictedTools).toBeDefined();
            expect(EDITOR_CHAT_CONFIG.restrictedTools).toContain('pricing');
            expect(EDITOR_CHAT_CONFIG.restrictedTools).toContain('revenue');
        });

        it('should have compact enabled features', () => {
            expect(EDITOR_CHAT_CONFIG.enabledFeatures.modelSelector).toBe(false);
            expect(EDITOR_CHAT_CONFIG.enabledFeatures.personaSelector).toBe(false);
        });

        it('should use purple theme', () => {
            expect(EDITOR_CHAT_CONFIG.themeColor).toBe('purple');
        });
    });

    describe('CUSTOMER_CHAT_CONFIG', () => {
        it('should have product-focused prompt suggestions', () => {
            expect(CUSTOMER_CHAT_CONFIG.promptSuggestions.length).toBeGreaterThan(0);
            expect(CUSTOMER_CHAT_CONFIG.promptSuggestions.some(s =>
                s.toLowerCase().includes('deal')
            )).toBe(true);
        });

        it('should have restricted admin tools', () => {
            expect(CUSTOMER_CHAT_CONFIG.restrictedTools).toBeDefined();
            expect(CUSTOMER_CHAT_CONFIG.restrictedTools).toContain('admin');
            expect(CUSTOMER_CHAT_CONFIG.restrictedTools).toContain('analytics');
        });

        it('should use emerald theme', () => {
            expect(CUSTOMER_CHAT_CONFIG.themeColor).toBe('emerald');
        });

        it('should have Smokey as persona', () => {
            expect(CUSTOMER_CHAT_CONFIG.agentPersona).toBe('smokey');
        });

        it('should have shopping-cart icon', () => {
            expect(CUSTOMER_CHAT_CONFIG.iconName).toBe('shopping-cart');
        });
    });

    describe('Config structure validation', () => {
        const allConfigs: RoleChatConfig[] = [
            EDITOR_CHAT_CONFIG,
            CUSTOMER_CHAT_CONFIG,
            BRAND_CHAT_CONFIG,
            DISPENSARY_CHAT_CONFIG,
            OWNER_CHAT_CONFIG
        ];

        it('all configs should have required fields', () => {
            allConfigs.forEach(config => {
                expect(config.role).toBeDefined();
                expect(config.title).toBeDefined();
                expect(config.subtitle).toBeDefined();
                expect(config.welcomeMessage).toBeDefined();
                expect(config.placeholder).toBeDefined();
                expect(config.promptSuggestions).toBeDefined();
                expect(config.agentPersona).toBeDefined();
                expect(config.themeColor).toBeDefined();
                expect(config.iconName).toBeDefined();
                expect(config.enabledFeatures).toBeDefined();
            });
        });

        it('all configs should have valid agent personas', () => {
            const validPersonas = ['smokey', 'craig', 'deebo', 'mrs_parker', 'pops', 'money_mike'];

            allConfigs.forEach(config => {
                expect(validPersonas).toContain(config.agentPersona);
            });
        });

        it('all configs should have at least 3 prompt suggestions', () => {
            allConfigs.forEach(config => {
                expect(config.promptSuggestions.length).toBeGreaterThanOrEqual(3);
            });
        });

        it('all configs should have valid icon names', () => {
            const validIcons = ['sparkles', 'briefcase', 'store', 'edit', 'shopping-cart', 'shield'];

            allConfigs.forEach(config => {
                expect(validIcons).toContain(config.iconName);
            });
        });
    });
});
