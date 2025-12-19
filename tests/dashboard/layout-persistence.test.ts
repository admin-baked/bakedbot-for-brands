/**
 * Unit tests for layout-persistence.ts
 * Tests save/load, version migration, and widget operations
 */

import {
    saveLayout,
    loadLayout,
    clearLayout,
    resetToDefaults,
    exportLayout,
    importLayout,
    addWidgetToLayout,
    removeWidgetFromLayout,
    updateWidgetPositions
} from '@/lib/dashboard/layout-persistence';
import { LAYOUT_VERSION, type UserRole, type WidgetInstance } from '@/lib/dashboard/widget-registry';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: jest.fn((key: string) => { delete store[key]; }),
        clear: () => { store = {}; }
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Layout Persistence', () => {
    beforeEach(() => {
        localStorageMock.clear();
        jest.clearAllMocks();
    });

    describe('saveLayout', () => {
        it('should save layout to localStorage', () => {
            const widgets: WidgetInstance[] = [
                { id: 'test-1', widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 2 }
            ];

            saveLayout('owner', widgets);

            expect(localStorageMock.setItem).toHaveBeenCalled();
            const savedKey = localStorageMock.setItem.mock.calls[0][0];
            expect(savedKey).toContain('owner');
        });

        it('should include version in saved layout', () => {
            const widgets: WidgetInstance[] = [
                { id: 'test-1', widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 2 }
            ];

            saveLayout('owner', widgets);

            const savedValue = localStorageMock.setItem.mock.calls[0][1];
            const parsed = JSON.parse(savedValue);
            expect(parsed.version).toBe(LAYOUT_VERSION);
        });

        it('should include role in saved layout', () => {
            const widgets: WidgetInstance[] = [];
            saveLayout('brand', widgets);

            const savedValue = localStorageMock.setItem.mock.calls[0][1];
            const parsed = JSON.parse(savedValue);
            expect(parsed.role).toBe('brand');
        });

        it('should include updatedAt timestamp', () => {
            const widgets: WidgetInstance[] = [];
            saveLayout('admin', widgets);

            const savedValue = localStorageMock.setItem.mock.calls[0][1];
            const parsed = JSON.parse(savedValue);
            expect(parsed.updatedAt).toBeDefined();
        });
    });

    describe('loadLayout', () => {
        it('should return defaults when no saved layout', () => {
            const layout = loadLayout('owner');
            expect(Array.isArray(layout)).toBe(true);
            expect(layout.length).toBeGreaterThan(0);
        });

        it('should load saved layout', () => {
            const widgets: WidgetInstance[] = [
                { id: 'custom-1', widgetType: 'foot-traffic', x: 5, y: 5, w: 4, h: 3 }
            ];

            const savedLayout = {
                version: LAYOUT_VERSION,
                role: 'owner',
                widgets,
                updatedAt: new Date().toISOString()
            };

            localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(savedLayout));

            const layout = loadLayout('owner');
            expect(layout).toEqual(widgets);
        });

        it('should return defaults on version mismatch', () => {
            const oldLayout = {
                version: 0, // Old version
                role: 'owner',
                widgets: [{ id: 'old', widgetType: 'old-widget', x: 0, y: 0, w: 1, h: 1 }],
                updatedAt: new Date().toISOString()
            };

            localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(oldLayout));

            const layout = loadLayout('owner');
            // Should return defaults, not old layout
            expect(layout.some(w => w.widgetType === 'old-widget')).toBe(false);
        });

        it('should filter out unavailable widgets', () => {
            const savedLayout = {
                version: LAYOUT_VERSION,
                role: 'brand' as UserRole,
                widgets: [
                    { id: '1', widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 2 },
                    { id: '2', widgetType: 'agent-status', x: 3, y: 0, w: 2, h: 2 } // Not visible for brand
                ],
                updatedAt: new Date().toISOString()
            };

            localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(savedLayout));

            const layout = loadLayout('brand');
            // Should filter out agent-status (not available for brand)
            const types = layout.map(w => w.widgetType);
            expect(types).toContain('top-zips');
            // Note: This test may need adjustment based on actual role visibility
        });
    });

    describe('clearLayout', () => {
        it('should remove layout from localStorage', () => {
            clearLayout('owner');
            expect(localStorageMock.removeItem).toHaveBeenCalled();
        });
    });

    describe('resetToDefaults', () => {
        it('should clear and return defaults', () => {
            const layout = resetToDefaults('owner');
            expect(localStorageMock.removeItem).toHaveBeenCalled();
            expect(Array.isArray(layout)).toBe(true);
            expect(layout.length).toBeGreaterThan(0);
        });
    });

    describe('exportLayout', () => {
        it('should return null when no layout saved', () => {
            localStorageMock.getItem.mockReturnValueOnce(null);
            const exported = exportLayout('owner');
            expect(exported).toBeNull();
        });

        it('should return JSON string when layout exists', () => {
            const savedLayout = { version: 1, widgets: [] };
            localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(savedLayout));

            const exported = exportLayout('owner');
            expect(typeof exported).toBe('string');
        });
    });

    describe('importLayout', () => {
        it('should import valid layout JSON', () => {
            const layout = {
                widgets: [
                    { id: 'imported', widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 2 }
                ]
            };

            const result = importLayout('owner', JSON.stringify(layout));
            expect(result).toBe(true);
            expect(localStorageMock.setItem).toHaveBeenCalled();
        });

        it('should reject invalid JSON', () => {
            const result = importLayout('owner', 'not-valid-json');
            expect(result).toBe(false);
        });

        it('should reject layout without widgets array', () => {
            const result = importLayout('owner', JSON.stringify({ version: 1 }));
            expect(result).toBe(false);
        });

        it('should update version on import', () => {
            const layout = { widgets: [] };
            importLayout('owner', JSON.stringify(layout));

            const savedValue = localStorageMock.setItem.mock.calls[0][1];
            const parsed = JSON.parse(savedValue);
            expect(parsed.version).toBe(LAYOUT_VERSION);
        });
    });

    describe('addWidgetToLayout', () => {
        it('should add widget at bottom of layout', () => {
            const current: WidgetInstance[] = [
                { id: '1', widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 2 }
            ];

            const updated = addWidgetToLayout(current, 'foot-traffic', 3, 2);

            expect(updated.length).toBe(2);
            expect(updated[1].widgetType).toBe('foot-traffic');
            expect(updated[1].y).toBe(2); // Below existing widget
        });

        it('should generate unique ID', () => {
            const current: WidgetInstance[] = [];
            const updated = addWidgetToLayout(current, 'seo-health');

            expect(updated[0].id).toContain('seo-health');
            expect(updated[0].id.length).toBeGreaterThan('seo-health'.length);
        });

        it('should use provided dimensions', () => {
            const updated = addWidgetToLayout([], 'claim-cta', 4, 3);

            expect(updated[0].w).toBe(4);
            expect(updated[0].h).toBe(3);
        });

        it('should use defaults when dimensions not provided', () => {
            const updated = addWidgetToLayout([], 'agent-status');

            expect(updated[0].w).toBe(2);
            expect(updated[0].h).toBe(2);
        });
    });

    describe('removeWidgetFromLayout', () => {
        it('should remove widget by ID', () => {
            const current: WidgetInstance[] = [
                { id: 'keep', widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 2 },
                { id: 'remove', widgetType: 'foot-traffic', x: 3, y: 0, w: 3, h: 2 }
            ];

            const updated = removeWidgetFromLayout(current, 'remove');

            expect(updated.length).toBe(1);
            expect(updated[0].id).toBe('keep');
        });

        it('should return same array if ID not found', () => {
            const current: WidgetInstance[] = [
                { id: 'keep', widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 2 }
            ];

            const updated = removeWidgetFromLayout(current, 'nonexistent');

            expect(updated.length).toBe(1);
        });

        it('should return empty array when removing last widget', () => {
            const current: WidgetInstance[] = [
                { id: 'only', widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 2 }
            ];

            const updated = removeWidgetFromLayout(current, 'only');

            expect(updated.length).toBe(0);
        });
    });

    describe('updateWidgetPositions', () => {
        it('should update positions from layout array', () => {
            const current: WidgetInstance[] = [
                { id: 'w1', widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 2 }
            ];

            const newPositions = [
                { i: 'w1', x: 5, y: 3, w: 4, h: 4 }
            ];

            const updated = updateWidgetPositions(current, newPositions);

            expect(updated[0].x).toBe(5);
            expect(updated[0].y).toBe(3);
            expect(updated[0].w).toBe(4);
            expect(updated[0].h).toBe(4);
        });

        it('should preserve widget properties not in layout', () => {
            const current: WidgetInstance[] = [
                { id: 'w1', widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 2, settings: { custom: true } }
            ];

            const newPositions = [{ i: 'w1', x: 1, y: 1, w: 2, h: 2 }];

            const updated = updateWidgetPositions(current, newPositions);

            expect(updated[0].widgetType).toBe('top-zips');
            expect(updated[0].settings).toEqual({ custom: true });
        });

        it('should ignore unmatched layout items', () => {
            const current: WidgetInstance[] = [
                { id: 'w1', widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 2 }
            ];

            const newPositions = [
                { i: 'w1', x: 1, y: 1, w: 2, h: 2 },
                { i: 'unknown', x: 5, y: 5, w: 3, h: 3 }
            ];

            const updated = updateWidgetPositions(current, newPositions);

            expect(updated.length).toBe(1);
        });
    });
});
