'use client';

/**
 * Modular Dashboard - Main container with react-grid-layout
 * Drag-and-drop dashboard with role-aware widgets and layout persistence
 */

import React, { useState, useEffect, useCallback } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserRole, WidgetInstance } from '@/lib/dashboard/widget-registry';
import { getWidgetByType } from '@/lib/dashboard/widget-registry';
import {
    loadLayout,
    saveLayout,
    resetToDefaults,
    addWidgetToLayout,
    removeWidgetFromLayout,
    updateWidgetPositions
} from '@/lib/dashboard/layout-persistence';
import { AddWidgetMenu } from './add-widget-menu';
import { getWidgetComponent } from './widgets';

interface ModularDashboardProps {
    role: UserRole;
    width?: number;
    cols?: number;
    rowHeight?: number;
}

export function ModularDashboard({
    role,
    width = 1200,
    cols = 12,
    rowHeight = 80
}: ModularDashboardProps) {
    const { toast } = useToast();
    const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load layout on mount
    useEffect(() => {
        const loaded = loadLayout(role);
        setWidgets(loaded);
        setIsLoaded(true);
    }, [role]);

    // Convert widgets to react-grid-layout format
    const layout: Layout[] = widgets.map(w => {
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
    const handleLayoutChange = useCallback((newLayout: Layout[]) => {
        const updated = updateWidgetPositions(widgets, newLayout);
        setWidgets(updated);
    }, [widgets]);

    // Save layout
    const handleSave = useCallback(() => {
        saveLayout(role, widgets);
        toast({
            title: 'Layout Saved',
            description: 'Your dashboard layout has been saved.'
        });
    }, [role, widgets, toast]);

    // Reset to defaults
    const handleReset = useCallback(() => {
        const defaults = resetToDefaults(role);
        setWidgets(defaults);
        toast({
            title: 'Layout Reset',
            description: 'Dashboard has been reset to default layout.'
        });
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

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Dashboard Controls */}
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
                    <Button size="sm" onClick={handleSave}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Layout
                    </Button>
                </div>
            </div>

            {/* Widget Grid */}
            {widgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">No widgets on your dashboard</p>
                    <AddWidgetMenu
                        role={role}
                        existingWidgetTypes={existingWidgetTypes}
                        onAddWidget={handleAddWidget}
                    />
                </div>
            ) : (
                <GridLayout
                    className="layout"
                    layout={layout}
                    cols={cols}
                    rowHeight={rowHeight}
                    width={width}
                    onLayoutChange={handleLayoutChange}
                    draggableHandle=".drag-handle"
                    compactType="vertical"
                    preventCollision={false}
                    isResizable={true}
                    margin={[16, 16]}
                >
                    {widgets.map(widget => {
                        const Component = getWidgetComponent(widget.widgetType);
                        if (!Component) return null;

                        return (
                            <div key={widget.id}>
                                <Component onRemove={() => handleRemoveWidget(widget.id)} />
                            </div>
                        );
                    })}
                </GridLayout>
            )}
        </div>
    );
}
