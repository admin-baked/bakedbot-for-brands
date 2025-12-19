/**
 * Unit tests for default-layouts.ts
 * Tests role-specific default widget configurations
 */

import {
    getDefaultLayoutForRole,
    getAllDefaultLayouts
} from '@/lib/dashboard/default-layouts';
import type { UserRole } from '@/lib/dashboard/widget-registry';

describe('Default Layouts', () => {
    describe('getDefaultLayoutForRole', () => {
        it('should return layout for owner role', () => {
            const layout = getDefaultLayoutForRole('owner');
            expect(Array.isArray(layout)).toBe(true);
            expect(layout.length).toBeGreaterThan(0);
        });

        it('should return layout for admin role', () => {
            const layout = getDefaultLayoutForRole('admin');
            expect(Array.isArray(layout)).toBe(true);
            expect(layout.length).toBeGreaterThan(0);
        });

        it('should return layout for brand role', () => {
            const layout = getDefaultLayoutForRole('brand');
            expect(Array.isArray(layout)).toBe(true);
            expect(layout.length).toBeGreaterThan(0);
        });

        it('should return layout for dispensary role', () => {
            const layout = getDefaultLayoutForRole('dispensary');
            expect(Array.isArray(layout)).toBe(true);
            expect(layout.length).toBeGreaterThan(0);
        });

        it('should return layout for editor role', () => {
            const layout = getDefaultLayoutForRole('editor');
            expect(Array.isArray(layout)).toBe(true);
            expect(layout.length).toBeGreaterThan(0);
        });

        it('should return empty layout for customer role', () => {
            const layout = getDefaultLayoutForRole('customer');
            expect(Array.isArray(layout)).toBe(true);
            expect(layout.length).toBe(0);
        });

        it('should return copy to prevent mutations', () => {
            const layout1 = getDefaultLayoutForRole('owner');
            const layout2 = getDefaultLayoutForRole('owner');
            expect(layout1).not.toBe(layout2);
            expect(layout1).toEqual(layout2);
        });
    });

    describe('Layouts have valid structure', () => {
        const roles: UserRole[] = ['owner', 'admin', 'brand', 'dispensary', 'editor'];

        roles.forEach(role => {
            it(`${role} layout has valid widget instances`, () => {
                const layout = getDefaultLayoutForRole(role);

                layout.forEach(widget => {
                    expect(widget).toHaveProperty('id');
                    expect(widget).toHaveProperty('widgetType');
                    expect(widget).toHaveProperty('x');
                    expect(widget).toHaveProperty('y');
                    expect(widget).toHaveProperty('w');
                    expect(widget).toHaveProperty('h');

                    expect(typeof widget.id).toBe('string');
                    expect(typeof widget.widgetType).toBe('string');
                    expect(typeof widget.x).toBe('number');
                    expect(typeof widget.y).toBe('number');
                    expect(typeof widget.w).toBe('number');
                    expect(typeof widget.h).toBe('number');
                });
            });

            it(`${role} layout has unique widget IDs`, () => {
                const layout = getDefaultLayoutForRole(role);
                const ids = layout.map(w => w.id);
                const uniqueIds = Array.from(new Set(ids));
                expect(ids.length).toBe(uniqueIds.length);
            });

            it(`${role} layout has non-negative positions`, () => {
                const layout = getDefaultLayoutForRole(role);

                layout.forEach(widget => {
                    expect(widget.x).toBeGreaterThanOrEqual(0);
                    expect(widget.y).toBeGreaterThanOrEqual(0);
                });
            });

            it(`${role} layout has positive dimensions`, () => {
                const layout = getDefaultLayoutForRole(role);

                layout.forEach(widget => {
                    expect(widget.w).toBeGreaterThan(0);
                    expect(widget.h).toBeGreaterThan(0);
                });
            });
        });
    });

    describe('Role-specific widget presence', () => {
        it('owner should have agent-status widget', () => {
            const layout = getDefaultLayoutForRole('owner');
            const types = layout.map(w => w.widgetType);
            expect(types).toContain('agent-status');
        });

        it('owner should have revenue-summary widget', () => {
            const layout = getDefaultLayoutForRole('owner');
            const types = layout.map(w => w.widgetType);
            expect(types).toContain('revenue-summary');
        });

        it('brand should have claim-cta widget', () => {
            const layout = getDefaultLayoutForRole('brand');
            const types = layout.map(w => w.widgetType);
            expect(types).toContain('claim-cta');
        });

        it('dispensary should have foot-traffic widget', () => {
            const layout = getDefaultLayoutForRole('dispensary');
            const types = layout.map(w => w.widgetType);
            expect(types).toContain('foot-traffic');
        });

        it('editor should have recent-reviews widget', () => {
            const layout = getDefaultLayoutForRole('editor');
            const types = layout.map(w => w.widgetType);
            expect(types).toContain('recent-reviews');
        });
    });

    describe('getAllDefaultLayouts', () => {
        it('should return layouts for all roles', () => {
            const layouts = getAllDefaultLayouts();

            expect(layouts).toHaveProperty('owner');
            expect(layouts).toHaveProperty('admin');
            expect(layouts).toHaveProperty('brand');
            expect(layouts).toHaveProperty('dispensary');
            expect(layouts).toHaveProperty('editor');
            expect(layouts).toHaveProperty('customer');
        });

        it('should return arrays for each role', () => {
            const layouts = getAllDefaultLayouts();

            Object.values(layouts).forEach(layout => {
                expect(Array.isArray(layout)).toBe(true);
            });
        });

        it('should return copies to prevent mutations', () => {
            const layouts1 = getAllDefaultLayouts();
            const layouts2 = getAllDefaultLayouts();

            expect(layouts1.owner).not.toBe(layouts2.owner);
            expect(layouts1.owner).toEqual(layouts2.owner);
        });
    });

    describe('Layout complexity by role', () => {
        it('owner should have most widgets', () => {
            const ownerLayout = getDefaultLayoutForRole('owner');
            const brandLayout = getDefaultLayoutForRole('brand');
            const editorLayout = getDefaultLayoutForRole('editor');

            expect(ownerLayout.length).toBeGreaterThanOrEqual(brandLayout.length);
            expect(ownerLayout.length).toBeGreaterThan(editorLayout.length);
        });

        it('admin should have similar widgets to owner', () => {
            const ownerLayout = getDefaultLayoutForRole('owner');
            const adminLayout = getDefaultLayoutForRole('admin');

            // Admin should have comparable number of widgets
            expect(adminLayout.length).toBeGreaterThan(0);
            expect(Math.abs(adminLayout.length - ownerLayout.length)).toBeLessThan(5);
        });

        it('customer should have minimal widgets', () => {
            const customerLayout = getDefaultLayoutForRole('customer');
            const brandLayout = getDefaultLayoutForRole('brand');

            expect(customerLayout.length).toBeLessThan(brandLayout.length);
        });
    });
});
