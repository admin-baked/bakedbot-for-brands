
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
            expect(persona.tools.length).toBeGreaterThan(0);
        });
    });

    it('puff should have access to all tools', () => {
        expect(PERSONAS.puff.tools).toContain('all');
    });

    it('specialized personas should have specific tools', () => {
        // Legacy
        expect(PERSONAS.wholesale_analyst.tools).toContain('all'); 
        
        // New Squad
        expect(PERSONAS.smokey.tools).toContain('cannmenus_discovery');
        expect(PERSONAS.craig.tools).toContain('gmail_action');
        expect(PERSONAS.pops.tools).toContain('sheets_action');
        expect(PERSONAS.ezal.tools).toContain('web_search');
    });
});
