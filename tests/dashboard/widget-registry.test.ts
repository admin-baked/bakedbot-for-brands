/**
 * Unit tests for widget-registry.ts
 * Tests widget definitions, role filtering, and category grouping
 */

import {
    getAllWidgets,
    getWidgetByType,
    getWidgetsForRole,
    getWidgetsByCategory,
    getWidgetsByCategories,
    isWidgetVisibleForRole,
    getCategoryDisplayName,
    LAYOUT_VERSION,
    type UserRole,
    type WidgetCategory,
    type WidgetConfig
} from '@/lib/dashboard/widget-registry';

describe('Widget Registry', () => {
    describe('getAllWidgets', () => {
        it('should return all registered widgets', () => {
            const widgets = getAllWidgets();
            expect(Array.isArray(widgets)).toBe(true);
            expect(widgets.length).toBeGreaterThan(0);
        });

        it('should return a copy to prevent mutations', () => {
            const widgets1 = getAllWidgets();
            const widgets2 = getAllWidgets();
            expect(widgets1).not.toBe(widgets2);
        });

        it('should have all required widget properties', () => {
            const widgets = getAllWidgets();
            widgets.forEach(widget => {
                expect(widget).toHaveProperty('id');
                expect(widget).toHaveProperty('type');
                expect(widget).toHaveProperty('title');
                expect(widget).toHaveProperty('description');
                expect(widget).toHaveProperty('component');
                expect(widget).toHaveProperty('minWidth');
                expect(widget).toHaveProperty('minHeight');
                expect(widget).toHaveProperty('defaultWidth');
                expect(widget).toHaveProperty('defaultHeight');
                expect(widget).toHaveProperty('visibleFor');
                expect(widget).toHaveProperty('category');
            });
        });
    });

    describe('getWidgetByType', () => {
        it('should return widget for valid type', () => {
            const widget = getWidgetByType('top-zips');
            expect(widget).toBeDefined();
            expect(widget?.type).toBe('top-zips');
            expect(widget?.title).toBe('Top Performing ZIPs');
        });

        it('should return undefined for invalid type', () => {
            const widget = getWidgetByType('nonexistent-widget');
            expect(widget).toBeUndefined();
        });

        it('should find all expected widget types', () => {
            const expectedTypes = [
                'top-zips',
                'foot-traffic',
                'seo-health',
                'agent-status',
                'claim-cta',
                'recent-reviews',
                'compliance-alerts'
            ];

            expectedTypes.forEach(type => {
                const widget = getWidgetByType(type);
                expect(widget).toBeDefined();
            });
        });
    });

    describe('getWidgetsForRole', () => {
        it('should return widgets for owner role', () => {
            const widgets = getWidgetsForRole('owner');
            expect(widgets.length).toBeGreaterThan(0);

            // Owner should see most widgets
            const types = widgets.map(w => w.type);
            expect(types).toContain('top-zips');
            expect(types).toContain('agent-status');
            expect(types).toContain('seo-health');
        });

        it('should return widgets for brand role', () => {
            const widgets = getWidgetsForRole('brand');
            expect(widgets.length).toBeGreaterThan(0);

            const types = widgets.map(w => w.type);
            expect(types).toContain('top-zips');
            expect(types).toContain('claim-cta');
            expect(types).toContain('campaign-metrics');
        });

        it('should return widgets for dispensary role', () => {
            const widgets = getWidgetsForRole('dispensary');
            expect(widgets.length).toBeGreaterThan(0);

            const types = widgets.map(w => w.type);
            expect(types).toContain('foot-traffic');
            expect(types).toContain('revenue-summary');
            expect(types).toContain('claim-cta');
        });

        it('should return widgets for editor role', () => {
            const widgets = getWidgetsForRole('editor');
            expect(widgets.length).toBeGreaterThan(0);

            const types = widgets.map(w => w.type);
            expect(types).toContain('recent-reviews');
        });

        it('should not return admin-only widgets for brand', () => {
            const widgets = getWidgetsForRole('brand');
            const types = widgets.map(w => w.type);
            expect(types).not.toContain('agent-status');
            expect(types).not.toContain('crawl-status');
        });

        it('should filter correctly for each role', () => {
            const roles: UserRole[] = ['owner', 'admin', 'brand', 'dispensary', 'editor', 'customer'];

            roles.forEach(role => {
                const widgets = getWidgetsForRole(role);
                widgets.forEach(widget => {
                    expect(widget.visibleFor).toContain(role);
                });
            });
        });
    });

    describe('getWidgetsByCategory', () => {
        it('should return insights widgets', () => {
            const widgets = getWidgetsByCategory('insights');
            expect(widgets.length).toBeGreaterThan(0);

            widgets.forEach(w => {
                expect(w.category).toBe('insights');
            });
        });

        it('should return seo widgets', () => {
            const widgets = getWidgetsByCategory('seo');
            expect(widgets.length).toBeGreaterThan(0);

            const types = widgets.map(w => w.type);
            expect(types).toContain('seo-health');
        });

        it('should return operations widgets', () => {
            const widgets = getWidgetsByCategory('operations');
            expect(widgets.length).toBeGreaterThan(0);

            const types = widgets.map(w => w.type);
            expect(types).toContain('agent-status');
        });

        it('should return compliance widgets', () => {
            const widgets = getWidgetsByCategory('compliance');
            expect(widgets.length).toBeGreaterThan(0);

            const types = widgets.map(w => w.type);
            expect(types).toContain('compliance-alerts');
        });
    });

    describe('getWidgetsByCategories', () => {
        it('should return all categories', () => {
            const categories = getWidgetsByCategories();

            expect(categories).toHaveProperty('insights');
            expect(categories).toHaveProperty('seo');
            expect(categories).toHaveProperty('operations');
            expect(categories).toHaveProperty('growth');
            expect(categories).toHaveProperty('content');
            expect(categories).toHaveProperty('compliance');
        });

        it('should group widgets correctly', () => {
            const categories = getWidgetsByCategories();

            Object.entries(categories).forEach(([category, widgets]) => {
                widgets.forEach(widget => {
                    expect(widget.category).toBe(category);
                });
            });
        });
    });

    describe('isWidgetVisibleForRole', () => {
        it('should return true for visible widgets', () => {
            expect(isWidgetVisibleForRole('top-zips', 'owner')).toBe(true);
            expect(isWidgetVisibleForRole('top-zips', 'brand')).toBe(true);
            expect(isWidgetVisibleForRole('claim-cta', 'brand')).toBe(true);
        });

        it('should return false for hidden widgets', () => {
            expect(isWidgetVisibleForRole('agent-status', 'brand')).toBe(false);
            expect(isWidgetVisibleForRole('agent-status', 'dispensary')).toBe(false);
            expect(isWidgetVisibleForRole('crawl-status', 'editor')).toBe(false);
        });

        it('should return false for nonexistent widgets', () => {
            expect(isWidgetVisibleForRole('fake-widget', 'owner')).toBe(false);
        });
    });

    describe('getCategoryDisplayName', () => {
        it('should return display names with emojis', () => {
            expect(getCategoryDisplayName('insights')).toContain('Insights');
            expect(getCategoryDisplayName('seo')).toContain('SEO');
            expect(getCategoryDisplayName('operations')).toContain('Operational');
            expect(getCategoryDisplayName('growth')).toContain('Growth');
            expect(getCategoryDisplayName('content')).toContain('Content');
            expect(getCategoryDisplayName('compliance')).toContain('Compliance');
        });
    });

    describe('LAYOUT_VERSION', () => {
        it('should be a positive number', () => {
            expect(typeof LAYOUT_VERSION).toBe('number');
            expect(LAYOUT_VERSION).toBeGreaterThan(0);
        });
    });

    describe('Widget configuration validation', () => {
        it('should have positive dimensions', () => {
            const widgets = getAllWidgets();
            widgets.forEach(widget => {
                expect(widget.minWidth).toBeGreaterThan(0);
                expect(widget.minHeight).toBeGreaterThan(0);
                expect(widget.defaultWidth).toBeGreaterThanOrEqual(widget.minWidth);
                expect(widget.defaultHeight).toBeGreaterThanOrEqual(widget.minHeight);
            });
        });

        it('should have non-empty visibleFor arrays', () => {
            const widgets = getAllWidgets();
            widgets.forEach(widget => {
                expect(Array.isArray(widget.visibleFor)).toBe(true);
                expect(widget.visibleFor.length).toBeGreaterThan(0);
            });
        });

        it('should have unique IDs', () => {
            const widgets = getAllWidgets();
            const ids = widgets.map(w => w.id);
            const uniqueIds = [...new Set(ids)];
            expect(ids.length).toBe(uniqueIds.length);
        });

        it('should have unique types', () => {
            const widgets = getAllWidgets();
            const types = widgets.map(w => w.type);
            const uniqueTypes = [...new Set(types)];
            expect(types.length).toBe(uniqueTypes.length);
        });
    });
});
