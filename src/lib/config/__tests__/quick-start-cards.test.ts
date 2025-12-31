// No explicit imports for Jest globals
import { PROMPT_CHIPS, WELCOME_MESSAGES, getRandomPromptsForRole } from '../quick-start-cards';

describe('Customer Role - PROMPT_CHIPS', () => {
    it('should have customer prompt chips defined', () => {
        expect(PROMPT_CHIPS.customer).toBeDefined();
        expect(Array.isArray(PROMPT_CHIPS.customer)).toBe(true);
    });

    it('should have at least 3 customer prompts', () => {
        expect(PROMPT_CHIPS.customer.length).toBeGreaterThanOrEqual(3);
    });

    it('should have customer-specific prompts', () => {
        const customerPrompts = PROMPT_CHIPS.customer;
        
        // Check for product discovery prompts
        const hasProductPrompts = customerPrompts.some(p => 
            p.toLowerCase().includes('product') || 
            p.toLowerCase().includes('recommend')
        );
        expect(hasProductPrompts).toBe(true);
    });

    it('should have all role types with prompts', () => {
        expect(PROMPT_CHIPS.brand).toBeDefined();
        expect(PROMPT_CHIPS.dispensary).toBeDefined();
        expect(PROMPT_CHIPS.owner).toBeDefined();
        expect(PROMPT_CHIPS.customer).toBeDefined();
        expect(PROMPT_CHIPS.super_admin).toBeDefined();
    });
});

describe('Super Admin Role', () => {
    it('should have super_admin prompt chips defined', () => {
        expect(PROMPT_CHIPS.super_admin).toBeDefined();
        expect(PROMPT_CHIPS.super_admin.length).toBeGreaterThanOrEqual(5);
    });

    it('should have platform-level prompts', () => {
        const suPrompts = PROMPT_CHIPS.super_admin;
        const hasPlatformPrompts = suPrompts.some(p => 
            p.toLowerCase().includes('platform') || 
            p.toLowerCase().includes('codebase') ||
            p.toLowerCase().includes('dutchie')
        );
        expect(hasPlatformPrompts).toBe(true);
    });

    it('should have a super_admin welcome message', () => {
        expect(WELCOME_MESSAGES.super_admin).toBeDefined();
        expect(WELCOME_MESSAGES.super_admin.toLowerCase()).toContain('super admin');
    });
});

describe('getRandomPromptsForRole', () => {
    it('should return the requested number of prompts', () => {
        const result = getRandomPromptsForRole('brand', 3);
        expect(result.length).toBe(3);
    });

    it('should return prompts for the specific role', () => {
        const result = getRandomPromptsForRole('dispensary', 2);
        // All returned prompts should be in the dispensary pool
        result.forEach(p => {
            expect(PROMPT_CHIPS.dispensary).toContain(p);
        });
    });

    it('should return empty array for invalid role', () => {
        const result = getRandomPromptsForRole('non_existent_role' as any);
        expect(result).toEqual([]);
    });

    it('should not return more prompts than available', () => {
        const total = PROMPT_CHIPS.customer.length;
        const result = getRandomPromptsForRole('customer', total + 5);
        expect(result.length).toBe(total);
    });
});

describe('Customer Role - WELCOME_MESSAGES', () => {
    it('should have customer welcome message defined', () => {
        expect(WELCOME_MESSAGES.customer).toBeDefined();
        expect(typeof WELCOME_MESSAGES.customer).toBe('string');
    });

    it('should have welcoming customer message content', () => {
        const message = WELCOME_MESSAGES.customer;
        
        expect(message.length).toBeGreaterThan(20);
        expect(message.toLowerCase()).toContain('welcome');
    });

    it('should have all role types with welcome messages', () => {
        expect(WELCOME_MESSAGES.brand).toBeDefined();
        expect(WELCOME_MESSAGES.dispensary).toBeDefined();
        expect(WELCOME_MESSAGES.owner).toBeDefined();
        expect(WELCOME_MESSAGES.customer).toBeDefined();
    });

    it('should have unique messages for each role', () => {
        const messages = [
            WELCOME_MESSAGES.brand,
            WELCOME_MESSAGES.dispensary,
            WELCOME_MESSAGES.owner,
            WELCOME_MESSAGES.customer
        ];
        
        const uniqueMessages = new Set(messages);
        expect(uniqueMessages.size).toBe(messages.length);
    });
});

describe('Role Consistency', () => {
    it('should have matching roles across PROMPT_CHIPS and WELCOME_MESSAGES', () => {
        const promptRoles = Object.keys(PROMPT_CHIPS);
        const welcomeRoles = Object.keys(WELCOME_MESSAGES);
        
        expect(promptRoles.sort()).toEqual(welcomeRoles.sort());
    });
});
