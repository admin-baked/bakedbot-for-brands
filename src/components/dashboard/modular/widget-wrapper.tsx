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
}

export function WidgetWrapper({
    title,
    icon,
    children,
    onRemove,
    onSettings,
    onExpand,
    className = ''
}: WidgetWrapperProps) {
    return (
        <Card className={`h-full flex flex-col ${className}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-3">
                <div className="flex items-center gap-2">
                    {/* Drag Handle */}
                    <div
                        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded drag-handle"
                        title="Drag to rearrange"
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>

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
            <CardContent className="flex-1 overflow-auto px-3 pb-3 no-drag" style={{ touchAction: 'pan-y' }}>
                {children}
            </CardContent>
        </Card>
    );
}
