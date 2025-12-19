/**
 * Layout Persistence - Save and load dashboard layouts
 * Supports localStorage (immediate) and user profile sync (future)
 */

import type { UserRole, DashboardLayout, WidgetInstance } from './widget-registry';
import { LAYOUT_VERSION, getWidgetsForRole } from './widget-registry';
import { getDefaultLayoutForRole } from './default-layouts';

const STORAGE_KEY_PREFIX = 'bakedbot_dashboard_layout_';

/**
 * Get storage key for a role
 */
function getStorageKey(role: UserRole): string {
    return `${STORAGE_KEY_PREFIX}${role}`;
}

/**
 * Save layout to localStorage
 */
export function saveLayout(role: UserRole, widgets: WidgetInstance[]): void {
    if (typeof window === 'undefined') return;

    const layout: DashboardLayout = {
        version: LAYOUT_VERSION,
        role,
        widgets,
        updatedAt: new Date().toISOString()
    };

    try {
        localStorage.setItem(getStorageKey(role), JSON.stringify(layout));
    } catch (error) {
        console.error('Failed to save dashboard layout:', error);
    }
}

/**
 * Load layout from localStorage
 * Returns default layout if none exists or version mismatch
 */
export function loadLayout(role: UserRole): WidgetInstance[] {
    if (typeof window === 'undefined') {
        return getDefaultLayoutForRole(role);
    }

    try {
        const stored = localStorage.getItem(getStorageKey(role));
        if (!stored) {
            return getDefaultLayoutForRole(role);
        }

        const layout: DashboardLayout = JSON.parse(stored);

        // Version check - reset to defaults if layout structure changed
        if (layout.version !== LAYOUT_VERSION) {
            console.log('Layout version mismatch, resetting to defaults');
            return getDefaultLayoutForRole(role);
        }

        // Filter out widgets that are no longer available for this role
        const availableWidgets = getWidgetsForRole(role);
        const availableTypes = new Set(availableWidgets.map(w => w.type));

        const validWidgets = layout.widgets.filter(w => availableTypes.has(w.widgetType));

        // If all widgets were removed, return defaults
        if (validWidgets.length === 0) {
            return getDefaultLayoutForRole(role);
        }

        return validWidgets;
    } catch (error) {
        console.error('Failed to load dashboard layout:', error);
        return getDefaultLayoutForRole(role);
    }
}

/**
 * Clear saved layout for a role
 */
export function clearLayout(role: UserRole): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem(getStorageKey(role));
    } catch (error) {
        console.error('Failed to clear dashboard layout:', error);
    }
}

/**
 * Reset layout to defaults
 */
export function resetToDefaults(role: UserRole): WidgetInstance[] {
    clearLayout(role);
    return getDefaultLayoutForRole(role);
}

/**
 * Export layout as JSON for backup/sharing
 */
export function exportLayout(role: UserRole): string | null {
    if (typeof window === 'undefined') return null;

    try {
        const stored = localStorage.getItem(getStorageKey(role));
        return stored;
    } catch (error) {
        console.error('Failed to export layout:', error);
        return null;
    }
}

/**
 * Import layout from JSON
 */
export function importLayout(role: UserRole, jsonString: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
        const layout: DashboardLayout = JSON.parse(jsonString);

        // Basic validation
        if (!layout.widgets || !Array.isArray(layout.widgets)) {
            throw new Error('Invalid layout format');
        }

        // Update version and role
        layout.version = LAYOUT_VERSION;
        layout.role = role;
        layout.updatedAt = new Date().toISOString();

        localStorage.setItem(getStorageKey(role), JSON.stringify(layout));
        return true;
    } catch (error) {
        console.error('Failed to import layout:', error);
        return false;
    }
}

/**
 * Add a widget to the layout
 */
export function addWidgetToLayout(
    currentWidgets: WidgetInstance[],
    widgetType: string,
    defaultWidth: number = 2,
    defaultHeight: number = 2
): WidgetInstance[] {
    // Find next available position (simple: add to bottom)
    const maxY = currentWidgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);

    const newWidget: WidgetInstance = {
        id: `${widgetType}_${Date.now()}`,
        widgetType,
        x: 0,
        y: maxY,
        w: defaultWidth,
        h: defaultHeight
    };

    return [...currentWidgets, newWidget];
}

/**
 * Remove a widget from the layout
 */
export function removeWidgetFromLayout(
    currentWidgets: WidgetInstance[],
    widgetId: string
): WidgetInstance[] {
    return currentWidgets.filter(w => w.id !== widgetId);
}

/**
 * Update widget positions from react-grid-layout
 */
export function updateWidgetPositions(
    currentWidgets: WidgetInstance[],
    newLayout: Array<{ i: string; x: number; y: number; w: number; h: number }>
): WidgetInstance[] {
    return currentWidgets.map(widget => {
        const layoutItem = newLayout.find(l => l.i === widget.id);
        if (layoutItem) {
            return {
                ...widget,
                x: layoutItem.x,
                y: layoutItem.y,
                w: layoutItem.w,
                h: layoutItem.h
            };
        }
        return widget;
    });
}
