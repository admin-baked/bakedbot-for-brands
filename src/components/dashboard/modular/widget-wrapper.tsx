'use client';

/**
 * Widget Wrapper - Container for dashboard widgets with drag handle and controls
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GripVertical, MoreVertical, X, Settings, Maximize2 } from 'lucide-react';

interface WidgetWrapperProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    onRemove?: () => void;
    onSettings?: () => void;
    onExpand?: () => void;
    className?: string;
    /** If true, widget cannot be dragged (fixed position) */
    isStatic?: boolean;
}

export function WidgetWrapper({
    title,
    icon,
    children,
    onRemove,
    onSettings,
    onExpand,
    className = '',
    isStatic = false
}: WidgetWrapperProps) {
    return (
        <Card className={`h-full flex flex-col ${isStatic ? 'no-drag' : ''} ${className}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-3 touch-none">
                <div className="flex items-center gap-2">
                    {/* Drag Handle - Only show if not static */}
                    {!isStatic && (
                        <div
                            className="cursor-move active:cursor-grabbing p-2 -ml-2 hover:bg-muted/50 rounded-md drag-handle touch-none"
                            title="Drag to rearrange"
                            style={{ touchAction: 'none' }}
                        >
                            <GripVertical className="h-5 w-5 text-muted-foreground/50 hover:text-foreground transition-colors" />
                        </div>
                    )}

                    {icon && <span className="text-muted-foreground">{icon}</span>}
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                </div>

                {/* Only show menu if at least one action is available */}
                {(onExpand || onSettings || onRemove) && (
                    <DropdownMenu modal={true}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[9999]" sideOffset={5}>
                            {onExpand && (
                                <DropdownMenuItem onClick={onExpand}>
                                    <Maximize2 className="h-4 w-4 mr-2" />
                                    Expand
                                </DropdownMenuItem>
                            )}
                            {onSettings && (
                                <DropdownMenuItem onClick={onSettings}>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Settings
                                </DropdownMenuItem>
                            )}
                            {onRemove && (
                                <DropdownMenuItem onClick={onRemove} className="text-destructive">
                                    <X className="h-4 w-4 mr-2" />
                                    Remove
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </CardHeader>
            <CardContent
                className="flex-1 overflow-auto px-3 pb-3 no-drag scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted/50 hover:scrollbar-thumb-muted"
                style={{ touchAction: 'pan-y' }}
            >
                {children}
            </CardContent>
        </Card>
    );
}
