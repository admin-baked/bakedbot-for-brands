'use client';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ChevronDown,
    Lock,
    Sparkles,
    Brain,
    Zap,
    Rocket,
    CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ThinkingLevel type for intelligence selector
export type ThinkingLevel = 'standard' | 'advanced' | 'expert' | 'genius';

export interface ModelSelectorProps {
    value: ThinkingLevel;
    onChange: (v: ThinkingLevel) => void;
    userPlan?: string;
}

export function ModelSelector({ value, onChange, userPlan = 'free' }: ModelSelectorProps) {
    const isPaid = userPlan !== 'free'; // Simple check, refine based on exact plan IDs if needed

    const options: Record<ThinkingLevel, { label: string, desc: string, icon: any, locked?: boolean }> = {
        standard: { label: 'Standard', desc: 'Fast & cost-effective (Flash)', icon: Zap },
        advanced: { label: 'Advanced', desc: 'Complex logic (Pro)', icon: Brain },
        expert: { label: 'Reasoning', desc: 'Deep thought (o1-like)', icon: Sparkles, locked: !isPaid },
        genius: { label: 'Genius', desc: 'Maximum intelligence (Gemini 3)', icon: Rocket, locked: !isPaid },
    };

    const SelectedIcon = options[value].icon;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs font-medium border border-transparent hover:border-border hover:bg-background">
                    <SelectedIcon className="h-3 w-3 text-primary" />
                    {options[value].label}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px]">
                <DropdownMenuLabel>Intelligence Level</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(options) as [ThinkingLevel, typeof options['standard']][]).map(([key, opt]) => (
                    <DropdownMenuItem 
                        key={key} 
                        onClick={() => !opt.locked && onChange(key)} 
                        disabled={opt.locked}
                        className={cn("flex flex-col items-start gap-1 py-3 cursor-pointer", opt.locked && "opacity-70 cursor-not-allowed")}
                    >
                        <div className="flex items-center gap-2 w-full">
                            <opt.icon className={cn("h-4 w-4", opt.locked ? "text-muted-foreground" : "text-primary")} />
                            <span className="font-medium flex-1">{opt.label}</span>
                            {opt.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                            {!opt.locked && value === key && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">
                            {opt.locked ? 'Upgrade to access this model' : opt.desc}
                        </span>
                    </DropdownMenuItem>
                ))}
                {!isPaid && (
                     <div className="p-2 bg-muted/30 text-[10px] text-muted-foreground text-center border-t mt-1">
                        Upgrade plan to unlock Reasoning & Genius models.
                     </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
