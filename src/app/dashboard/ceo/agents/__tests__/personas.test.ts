
import { PERSONAS } from '../personas';

describe('Agent Personas Configuration', () => {
    it('should have all required personas', () => {
        const requiredPersonas = [
            'puff',
            'smokey',
            'craig',
            'pops',
            'ezal',
            'money_mike',
            'mrs_parker',
            'deebo'
        ];

        requiredPersonas.forEach(id => {
            expect(PERSONAS).toHaveProperty(id);
            expect(PERSONAS[id as keyof typeof PERSONAS].id).toBe(id);
        });
    });

    it('should have valid configuration for each persona', () => {
        Object.values(PERSONAS).forEach(persona => {
            expect(persona.name).toBeTruthy();
            expect(persona.description).toBeTruthy();
            expect(persona.systemPrompt).toBeTruthy();
            if (persona.systemPrompt.includes('Legacy')) {
                 expect(persona.systemPrompt.length).toBeGreaterThan(10);
            } else {
                 expect(persona.systemPrompt.length).toBeGreaterThan(50); // Ensure prompt is substantial
            }
            expect(Array.isArray(persona.tools)).toBe(true);
            // Personas may have tools OR skills (new modular system)
            // At least one of them must be defined
            const hasToolsOrSkills = persona.tools.length > 0 || (persona.skills && persona.skills.length > 0);
            expect(hasToolsOrSkills).toBe(true);
        });
    });

    it('puff should have access to all tools', () => {
        expect(PERSONAS.puff.tools).toContain('all');
    });

    it('specialized personas should have specific skills or tools', () => {
        // Legacy agents use tools array
        expect(PERSONAS.wholesale_analyst.tools).toContain('all');

        // New Squad uses skills system (or may have legacy tools too)
        // Check for skills as primary, fallback to tools for backwards compatibility
        expect(PERSONAS.smokey.skills).toContain('domain/cannmenus');
        expect(PERSONAS.craig.tools).toContain('gmail_action');
        expect(PERSONAS.pops.tools).toContain('sheets_action');
        expect(PERSONAS.ezal.tools).toContain('web_search');
    });
});
