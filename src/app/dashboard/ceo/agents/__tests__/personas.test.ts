
import { PERSONAS } from '../personas';

describe('Agent Personas Configuration', () => {
    it('should have all required personas', () => {
        const requiredPersonas = ['puff', 'wholesale_analyst', 'menu_watchdog', 'sales_scout'];

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
            expect(persona.systemPrompt.length).toBeGreaterThan(50); // Ensure prompt is substantial
            expect(Array.isArray(persona.tools)).toBe(true);
            expect(persona.tools.length).toBeGreaterThan(0);
        });
    });

    it('puff should have access to all tools', () => {
        expect(PERSONAS.puff.tools).toContain('all');
    });

    it('specialized personas should have specific tools', () => {
        expect(PERSONAS.wholesale_analyst.tools).toContain('leaflink_action');
        expect(PERSONAS.menu_watchdog.tools).toContain('dutchie_action');
        expect(PERSONAS.sales_scout.tools).toContain('search_web');
    });
});
