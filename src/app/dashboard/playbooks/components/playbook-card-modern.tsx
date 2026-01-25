'use client';

/**
 * Playbook Card Modern
 *
 * Glassmorphism-styled playbook card with toggle, icon, and category badge.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    MoreHorizontal,
    LineChart,
    FileText,
    AlertTriangle,
    ShieldAlert,
    BarChart3,
    Zap,
    Brain,
    Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Playbook } from '../data';

// Category configuration with icons and colors
const CATEGORY_CONFIG: Record<string, {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    badgeBg: string;
    badgeText: string;
}> = {
    INTEL: {
        icon: LineChart,
        iconBg: 'bg-purple-600',
        badgeBg: 'bg-purple-900/50',
        badgeText: 'text-purple-300',
    },
    SEO: {
        icon: FileText,
        iconBg: 'bg-blue-600',
        badgeBg: 'bg-blue-900/50',
        badgeText: 'text-blue-300',
    },
    OPS: {
        icon: AlertTriangle,
        iconBg: 'bg-orange-600',
        badgeBg: 'bg-orange-900/50',
        badgeText: 'text-orange-300',
    },
    COMPLIANCE: {
        icon: ShieldAlert,
        iconBg: 'bg-red-600',
        badgeBg: 'bg-red-900/50',
        badgeText: 'text-red-300',
    },
    FINANCE: {
        icon: BarChart3,
        iconBg: 'bg-green-600',
        badgeBg: 'bg-green-900/50',
        badgeText: 'text-green-300',
    },
    AUTOMATION: {
        icon: Zap,
        iconBg: 'bg-yellow-600',
        badgeBg: 'bg-yellow-900/50',
        badgeText: 'text-yellow-300',
    },
    REPORTING: {
        icon: Brain,
        iconBg: 'bg-cyan-600',
        badgeBg: 'bg-cyan-900/50',
        badgeText: 'text-cyan-300',
    },
    SIGNAL: {
        icon: Settings,
        iconBg: 'bg-slate-600',
        badgeBg: 'bg-slate-900/50',
        badgeText: 'text-slate-300',
    },
};

interface PlaybookCardModernProps {
    playbook: Playbook;
    onToggle?: (id: string, enabled: boolean) => void;
    onRun?: (playbook: Playbook) => void;
    onEdit?: (playbook: Playbook) => void;
    onDuplicate?: (playbook: Playbook) => void;
    onDelete?: (playbook: Playbook) => void;
}

export function PlaybookCardModern({
    playbook,
    onToggle,
    onRun,
    onEdit,
    onDuplicate,
    onDelete,
}: PlaybookCardModernProps) {
    const [isEnabled, setIsEnabled] = useState(playbook.active);

    const config = CATEGORY_CONFIG[playbook.type] || CATEGORY_CONFIG.SIGNAL;
    const Icon = config.icon;

    const handleToggle = (checked: boolean) => {
        setIsEnabled(checked);
        onToggle?.(playbook.id, checked);
    };

    // Derive schedule from playbook type
    const schedule = ['INTEL', 'SEO', 'REPORTING'].includes(playbook.type)
        ? 'Runs daily'
        : 'Event-driven';

    return (
        <Card
            className={cn(
                'glass-card glass-card-hover rounded-xl p-5 flex flex-col justify-between cursor-pointer',
                'transition-all duration-200'
            )}
            onClick={() => onRun?.(playbook)}
        >
            <div className="flex justify-between items-start">
                <div className="flex gap-4">
                    {/* Icon */}
                    <div className={cn('p-3 rounded-lg h-min', config.iconBg)}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    {/* Title & Description */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-1">
                            {playbook.title}
                        </h3>
                        <p className="text-muted-foreground text-sm line-clamp-2">
                            {playbook.description}
                        </p>
                    </div>
                </div>
                {/* Toggle & Menu */}
                <div className="flex items-center gap-3 ml-2" onClick={(e) => e.stopPropagation()}>
                    <Switch
                        checked={isEnabled}
                        onCheckedChange={handleToggle}
                        aria-label={`Toggle ${playbook.title}`}
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit?.(playbook)}>
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDuplicate?.(playbook)}>
                                Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onDelete?.(playbook)}
                                className="text-destructive focus:text-destructive"
                            >
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Footer: Schedule & Category */}
            <div className="flex items-center justify-between mt-6">
                <div className="flex items-center gap-2">
                    <Switch
                        checked={isEnabled}
                        onCheckedChange={handleToggle}
                        className="scale-90"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-foreground text-sm font-medium">{schedule}</span>
                </div>
                <span
                    className={cn(
                        'text-xs font-bold px-2 py-1 rounded-md uppercase',
                        config.badgeBg,
                        config.badgeText
                    )}
                >
                    {playbook.type}
                </span>
            </div>
        </Card>
    );
}

export default PlaybookCardModern;
