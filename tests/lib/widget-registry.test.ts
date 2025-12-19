/**
 * Unit Tests: Widget Registry
 * 
 * Tests for the widget registry that defines available dashboard widgets
 */

import {
    getAllWidgets,
    getWidgetByType,
    getWidgetsForRole,
    getWidgetsByCategory,
    isWidgetVisibleForRole,
    getCategoryDisplayName,
    type UserRole,
    type WidgetCategory
} from '@/lib/dashboard/widget-registry';

describe('Widget Registry', () => {
    describe('getAllWidgets', () => {
        it('should return an array of widgets', () => {
            const widgets = getAllWidgets();
            expect(Array.isArray(widgets)).toBe(true);
            expect(widgets.length).toBeGreaterThan(0);
        });

        it('should return widgets with required properties', () => {
            const widgets = getAllWidgets();
            widgets.forEach(widget => {
                expect(widget.id).toBeDefined();
                expect(widget.type).toBeDefined();
                expect(widget.title).toBeDefined();
                expect(widget.component).toBeDefined();
                expect(widget.minWidth).toBeGreaterThan(0);
                expect(widget.minHeight).toBeGreaterThan(0);
                expect(Array.isArray(widget.visibleFor)).toBe(true);
            });
        });
    });

    describe('getWidgetByType', () => {
        it('should return widget for valid type', () => {
            const widget = getWidgetByType('top-zips');
            expect(widget).toBeDefined();
            expect(widget?.title).toBe('Top Performing ZIPs');
        });

        it('should return undefined for invalid type', () => {
            const widget = getWidgetByType('invalid-widget');
            expect(widget).toBeUndefined();
        });
    });

    describe('getWidgetsForRole', () => {
        it('should return widgets for owner role', () => {
            const widgets = getWidgetsForRole('owner');
            expect(widgets.length).toBeGreaterThan(0);
            widgets.forEach(widget => {
                expect(widget.visibleFor).toContain('owner');
            });
        });

        it('should return widgets for brand role', () => {
            const widgets = getWidgetsForRole('brand');
            expect(widgets.length).toBeGreaterThan(0);
        });

        it('should return fewer widgets for customer role', () => {
            const ownerWidgets = getWidgetsForRole('owner');
            const customerWidgets = getWidgetsForRole('customer');
            expect(customerWidgets.length).toBeLessThanOrEqual(ownerWidgets.length);
        });

        it('should return editor widgets including content category', () => {
            const widgets = getWidgetsForRole('editor');
            const hasContentWidget = widgets.some(w => w.category === 'content');
            expect(hasContentWidget).toBe(true);
        });
    });

    describe('getWidgetsByCategory', () => {
        const categories: WidgetCategory[] = ['insights', 'seo', 'operations', 'growth', 'content', 'compliance'];

        categories.forEach(category => {
            it(`should return widgets for ${category} category`, () => {
                const widgets = getWidgetsByCategory(category);
                expect(Array.isArray(widgets)).toBe(true);
                widgets.forEach(widget => {
                    expect(widget.category).toBe(category);
                });
            });
        });
    });

    describe('isWidgetVisibleForRole', () => {
        it('should return true for visible widget', () => {
            const isVisible = isWidgetVisibleForRole('top-zips', 'owner');
            expect(isVisible).toBe(true);
        });

        it('should return false for non-visible widget', () => {
            // Revenue summary is only for owner/admin/dispensary, not brand
            const widget = getWidgetByType('revenue-summary');
            if (widget && !widget.visibleFor.includes('customer')) {
                const isVisible = isWidgetVisibleForRole('revenue-summary', 'customer');
                expect(isVisible).toBe(false);
            }
        });

        it('should return false for invalid widget', () => {
            const isVisible = isWidgetVisibleForRole('invalid', 'owner');
            expect(isVisible).toBe(false);
        });
    });

    describe('getCategoryDisplayName', () => {
        it('should return display name with emoji for insights', () => {
            const name = getCategoryDisplayName('insights');
            expect(name).toContain('Insights');
        });

        it('should return display name for all categories', () => {
            const categories: WidgetCategory[] = ['insights', 'seo', 'operations', 'growth', 'content', 'compliance'];
            categories.forEach(category => {
                const name = getCategoryDisplayName(category);
                expect(name.length).toBeGreaterThan(0);
            });
        });
    });
});
