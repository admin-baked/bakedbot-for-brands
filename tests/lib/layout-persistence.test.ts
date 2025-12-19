/**
 * Unit Tests: Layout Persistence
 * 
 * Tests for saving and loading dashboard layouts to localStorage
 */

import {
    saveLayout,
    loadLayout,
    clearLayout,
    resetToDefaults,
    addWidgetToLayout,
    removeWidgetFromLayout,
    updateWidgetPositions,
    exportLayout,
    importLayout
} from '@/lib/dashboard/layout-persistence';
import type { WidgetInstance } from '@/lib/dashboard/widget-registry';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: jest.fn((key: string) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; }),
        get length() { return Object.keys(store).length; },
        key: jest.fn((i: number) => Object.keys(store)[i] || null)
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Layout Persistence', () => {
    beforeEach(() => {
        localStorageMock.clear();
        jest.clearAllMocks();
    });

    const mockWidgets: WidgetInstance[] = [
        { id: 'w1', widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 3 },
        { id: 'w2', widgetType: 'foot-traffic', x: 3, y: 0, w: 3, h: 2 }
    ];

    describe('saveLayout', () => {
        it('should save layout to localStorage', () => {
            saveLayout('owner', mockWidgets);

            expect(localStorageMock.setItem).toHaveBeenCalled();
            const savedKey = localStorageMock.setItem.mock.calls[0][0];
            expect(savedKey).toContain('owner');
        });

        it('should include version and timestamp', () => {
            saveLayout('brand', mockWidgets);

            const savedValue = localStorageMock.setItem.mock.calls[0][1];
            const parsed = JSON.parse(savedValue);

            expect(parsed.version).toBeDefined();
            expect(parsed.updatedAt).toBeDefined();
            expect(parsed.widgets).toEqual(mockWidgets);
        });
    });

    describe('loadLayout', () => {
        it('should return default layout when nothing saved', () => {
            const widgets = loadLayout('owner');
            expect(Array.isArray(widgets)).toBe(true);
        });

        it('should load saved layout', () => {
            saveLayout('owner', mockWidgets);
            const loaded = loadLayout('owner');

            expect(loaded.length).toBe(mockWidgets.length);
        });
    });

    describe('clearLayout', () => {
        it('should remove saved layout', () => {
            saveLayout('owner', mockWidgets);
            clearLayout('owner');

            expect(localStorageMock.removeItem).toHaveBeenCalled();
        });
    });

    describe('resetToDefaults', () => {
        it('should clear and return defaults', () => {
            saveLayout('owner', mockWidgets);
            const defaults = resetToDefaults('owner');

            expect(localStorageMock.removeItem).toHaveBeenCalled();
            expect(Array.isArray(defaults)).toBe(true);
        });
    });

    describe('addWidgetToLayout', () => {
        it('should add widget to end of layout', () => {
            const updated = addWidgetToLayout(mockWidgets, 'seo-health', 3, 3);

            expect(updated.length).toBe(mockWidgets.length + 1);
            expect(updated[updated.length - 1].widgetType).toBe('seo-health');
        });

        it('should generate unique id', () => {
            const updated = addWidgetToLayout(mockWidgets, 'seo-health');

            expect(updated[updated.length - 1].id).toContain('seo-health');
        });

        it('should position new widget below existing ones', () => {
            const updated = addWidgetToLayout(mockWidgets, 'seo-health', 3, 3);
            const newWidget = updated[updated.length - 1];

            // Should be at or below existing widgets
            expect(newWidget.y).toBeGreaterThanOrEqual(0);
        });
    });

    describe('removeWidgetFromLayout', () => {
        it('should remove widget by id', () => {
            const updated = removeWidgetFromLayout(mockWidgets, 'w1');

            expect(updated.length).toBe(mockWidgets.length - 1);
            expect(updated.find(w => w.id === 'w1')).toBeUndefined();
        });

        it('should not modify original array', () => {
            const original = [...mockWidgets];
            removeWidgetFromLayout(mockWidgets, 'w1');

            expect(mockWidgets).toEqual(original);
        });
    });

    describe('updateWidgetPositions', () => {
        it('should update positions from layout', () => {
            const newLayout = [
                { i: 'w1', x: 5, y: 5, w: 4, h: 4 },
                { i: 'w2', x: 0, y: 0, w: 2, h: 2 }
            ];

            const updated = updateWidgetPositions(mockWidgets, newLayout);

            const w1 = updated.find(w => w.id === 'w1');
            expect(w1?.x).toBe(5);
            expect(w1?.y).toBe(5);
            expect(w1?.w).toBe(4);
            expect(w1?.h).toBe(4);
        });

        it('should preserve unchanged widgets', () => {
            const newLayout = [{ i: 'w1', x: 5, y: 5, w: 4, h: 4 }];

            const updated = updateWidgetPositions(mockWidgets, newLayout);

            // w2 should be unchanged
            const w2 = updated.find(w => w.id === 'w2');
            expect(w2?.x).toBe(3);
            expect(w2?.y).toBe(0);
        });
    });

    describe('exportLayout', () => {
        it('should return JSON string of layout', () => {
            saveLayout('owner', mockWidgets);
            const exported = exportLayout('owner');

            expect(exported).not.toBeNull();
            const parsed = JSON.parse(exported!);
            expect(parsed.widgets).toBeDefined();
        });

        it('should return null if no layout saved', () => {
            const exported = exportLayout('brand');
            expect(exported).toBeNull();
        });
    });

    describe('importLayout', () => {
        it('should import valid layout', () => {
            const layoutJson = JSON.stringify({
                version: 1,
                widgets: mockWidgets,
                updatedAt: new Date().toISOString()
            });

            const result = importLayout('owner', layoutJson);
            expect(result).toBe(true);
        });

        it('should reject invalid layout', () => {
            const result = importLayout('owner', 'invalid json');
            expect(result).toBe(false);
        });

        it('should reject layout without widgets', () => {
            const result = importLayout('owner', JSON.stringify({ version: 1 }));
            expect(result).toBe(false);
        });
    });
});
