'use client';

/**
 * Modular Dashboard - Main container with react-grid-layout
 * Drag-and-drop dashboard with role-aware widgets and layout persistence
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactGridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserRole, WidgetInstance } from '@/lib/dashboard/widget-registry';
import { getWidgetByType } from '@/lib/dashboard/widget-registry';
import {
    loadLayout as loadLocalLayout,
    saveLayout as saveLocalLayout,
    resetToDefaults,
    addWidgetToLayout,
    removeWidgetFromLayout,
    updateWidgetPositions
} from '@/lib/dashboard/layout-persistence';
import { AddWidgetMenu } from './add-widget-menu';
import { getWidgetComponent } from './widgets';
import { saveDashboardLayout, getDashboardLayout } from '@/server/actions/dashboard-layout';

// Define our layout item type matching react-grid-layout expectations
interface LayoutItem {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
}

interface ModularDashboardProps {
    role: UserRole;
    width?: number;
    cols?: number;
    rowHeight?: number;
    isEditable?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dashboardData?: any;
}

export function ModularDashboard({
    role,
    width = 1200,
    cols = 12,
    rowHeight = 80,
    isEditable = true,
    dashboardData
}: ModularDashboardProps) {
    const { toast } = useToast();
    const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Container ref and width for responsive grid
    const containerRef = useRef<HTMLDivElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [containerWidth, setContainerWidth] = useState(width);

    // Measure container width on mount and resize
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateWidth = () => {
            setContainerWidth(container.offsetWidth || width);
        };

        updateWidth();

        // Use ResizeObserver if available
        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(updateWidth);
            observer.observe(container);
            return () => observer.disconnect();
        } else {
            // Fallback to window resize
            window.addEventListener('resize', updateWidth);
            return () => window.removeEventListener('resize', updateWidth);
        }
    }, [width]);

    // Load layout on mount (Server > Local > Default) - deferred to avoid hydration mismatch
    useEffect(() => {
        let mounted = true;

        async function initLayout() {
            // 1. Try local first (fastest) - only runs on client after hydration
            if (typeof window !== 'undefined') {
                const local = loadLocalLayout(role);
                if (mounted) setWidgets(local);
            }

            // 2. Fetch server layout
            try {
                const result = await getDashboardLayout(role);
                if (mounted && result.success && result.layout) {
                    setWidgets(result.layout);
                    // Update local storage to match server
                    saveLocalLayout(role, result.layout);
                }
            } catch (err) {
                console.error('Failed to sync layout from server', err);
            } finally {
                if (mounted) setIsLoaded(true);
            }
        }

        initLayout();

        return () => { mounted = false; };
    }, [role]);

    // Convert widgets to react-grid-layout format
    const layout: LayoutItem[] = widgets.map(w => {
        const config = getWidgetByType(w.widgetType);
        return {
            i: w.id,
            x: w.x,
            y: w.y,
            w: w.w,
            h: w.h,
            minW: config?.minWidth || 2,
            minH: config?.minHeight || 2
        };
    });

    // Handle layout change from drag/resize
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleLayoutChange = useCallback((newLayout: any) => {
        // Only allow layout changes if editable
        if (!isEditable) return;

        // Convert layout items to our simple format
        const simplified = (newLayout as LayoutItem[]).map(item => ({
            i: item.i,
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h
        }));
        const updated = updateWidgetPositions(widgets, simplified);
        setWidgets(updated);
        // Optimistic local save
        saveLocalLayout(role, updated);

        // Debounced server save (2s)
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        setIsSaving(true);
        saveTimeoutRef.current = setTimeout(async () => {
            const result = await saveDashboardLayout(role, updated);
            setIsSaving(false);
            if (!result.success) {
                console.error('Failed to auto-save layout');
            }
        }, 2000);
    }, [widgets, isEditable, role]);

    // Save layout
    const handleSave = useCallback(async () => {
        setIsSaving(true);

        // 1. Save Local
        saveLocalLayout(role, widgets);

        // 2. Save Server
        const result = await saveDashboardLayout(role, widgets);

        setIsSaving(false);

        if (result.success) {
            toast({
                title: 'Layout Saved',
                description: 'Your dashboard layout has been saved to your profile.'
            });
        } else {
            toast({
                title: 'Save Failed',
                description: 'Could not save to server, but local copy is updated.',
                variant: 'destructive'
            });
        }
    }, [role, widgets, toast]);

    // Reset to defaults
    const handleReset = useCallback(() => {
        const defaults = resetToDefaults(role);
        setWidgets(defaults);
        toast({
            title: 'Layout Reset',
            description: 'Dashboard has been reset to default layout.'
        });
        // Trigger server save of defaults? Or just let them save manually?
        // Let's autosave defaults to sync
        saveDashboardLayout(role, defaults);
    }, [role, toast]);


    // Add widget
    const handleAddWidget = useCallback((widgetType: string) => {
        const config = getWidgetByType(widgetType);
        if (!config) return;

        const updated = addWidgetToLayout(
            widgets,
            widgetType,
            config.defaultWidth,
            config.defaultHeight
        );
        setWidgets(updated);
        toast({
            title: 'Widget Added',
            description: `${config.title} has been added to your dashboard.`
        });
    }, [widgets, toast]);

    // Remove widget
    const handleRemoveWidget = useCallback((widgetId: string) => {
        const updated = removeWidgetFromLayout(widgets, widgetId);
        setWidgets(updated);
        toast({
            title: 'Widget Removed',
            description: 'Widget has been removed from your dashboard.'
        });
    }, [widgets, toast]);

    // Get existing widget types
    const existingWidgetTypes = widgets.map(w => w.widgetType);

    // Mobile detection
    const isMobile = containerWidth < 768;
    const activeCols = isMobile ? 1 : cols;

    // Render grid - using ReactGridLayout directly with measured container width
    const renderGrid = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const GridComponent = ReactGridLayout as any;
        return (
            <GridComponent
                className={`layout ${!isEditable ? 'pointer-events-none-if-needed' : ''}`}
                layout={layout}
                cols={activeCols}
                rowHeight={rowHeight}
                width={containerWidth}
                onLayoutChange={handleLayoutChange}
                draggableHandle=".drag-handle"
                draggableCancel=".no-drag"
                compactType="vertical"
                preventCollision={false}
                isResizable={isEditable && !isMobile} // Disable resize on mobile
                isDraggable={isEditable} // Keep draggable, but handle is strict
                margin={[10, 10]}
                containerPadding={isMobile ? [10, 10] : [0, 0]}
            >
                {widgets.map(widget => {
                    const Component = getWidgetComponent(widget.widgetType);
                    if (!Component) return null;

                    // On mobile, force widgets to be full width
                    const gridItemProps = isMobile ? {
                        'data-grid': { ...widget, w: 1, x: 0 } // force 1 col width
                    } : {};

                    return (
                        <div key={widget.id} {...gridItemProps} className="touch-manipulation">
                            <Component
                                onRemove={isEditable ? () => handleRemoveWidget(widget.id) : undefined}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                {...(dashboardData ? { data: dashboardData } : {})}
                            />
                        </div>
                    );
                })}
            </GridComponent>
        );
    };

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div ref={containerRef} className="space-y-4">
            {/* Dashboard Controls - Only show in Edit Mode */}
            {isEditable && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold">Dashboard</h2>
                        <Badge variant="outline" className="capitalize">{role}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <AddWidgetMenu
                            role={role}
                            existingWidgetTypes={existingWidgetTypes}
                            onAddWidget={handleAddWidget}
                        />
                        <Button variant="outline" size="sm" onClick={handleReset}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {isSaving ? 'Saving...' : 'Save Layout'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Widget Grid */}
            {widgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">No widgets on your dashboard</p>
                    {isEditable && (
                        <AddWidgetMenu
                            role={role}
                            existingWidgetTypes={existingWidgetTypes}
                            onAddWidget={handleAddWidget}
                        />
                    )}
                </div>
            ) : (
                renderGrid()
            )}
        </div>
    );
}
