'use client';

/**
 * Add Widget Menu - Modal/popover for adding new widgets to dashboard
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, Search } from 'lucide-react';
import {
    type WidgetConfig,
    type UserRole,
    getWidgetsForRole,
    getCategoryDisplayName,
    type WidgetCategory
} from '@/lib/dashboard/widget-registry';

interface AddWidgetMenuProps {
    role: UserRole;
    existingWidgetTypes: string[];
    onAddWidget: (widgetType: string) => void;
}

export function AddWidgetMenu({ role, existingWidgetTypes, onAddWidget }: AddWidgetMenuProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const availableWidgets = getWidgetsForRole(role);

    // Filter out already added widgets and apply search
    const filteredWidgets = availableWidgets.filter(w => {
        const notAdded = !existingWidgetTypes.includes(w.type);
        const matchesSearch = search === '' ||
            w.title.toLowerCase().includes(search.toLowerCase()) ||
            w.description.toLowerCase().includes(search.toLowerCase());
        return notAdded && matchesSearch;
    });

    // Group by category
    const widgetsByCategory = filteredWidgets.reduce((acc, widget) => {
        if (!acc[widget.category]) {
            acc[widget.category] = [];
        }
        acc[widget.category].push(widget);
        return acc;
    }, {} as Record<WidgetCategory, WidgetConfig[]>);

    const handleAdd = (widgetType: string) => {
        onAddWidget(widgetType);
        setOpen(false);
        setSearch('');
    };

    const categories = Object.keys(widgetsByCategory) as WidgetCategory[];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Widget
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add Widget</DialogTitle>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search widgets..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <ScrollArea className="h-[400px] pr-4">
                    {categories.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No widgets available to add.</p>
                            <p className="text-sm">All widgets have been added to your dashboard.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {categories.map(category => (
                                <div key={category}>
                                    <h4 className="text-sm font-medium mb-2">
                                        {getCategoryDisplayName(category)}
                                    </h4>
                                    <div className="space-y-2">
                                        {widgetsByCategory[category].map(widget => (
                                            <button
                                                key={widget.id}
                                                onClick={() => handleAdd(widget.type)}
                                                className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-medium">{widget.title}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {widget.description}
                                                        </p>
                                                    </div>
                                                    <Badge variant="secondary" className="ml-2 shrink-0">
                                                        {widget.minWidth}x{widget.minHeight}
                                                    </Badge>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
