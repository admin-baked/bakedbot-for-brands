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
    CheckCircle2,
    Globe,
    Leaf
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ThinkingLevel type for intelligence selector
// NOTE: Keep in sync with src/ai/model-selector.ts
export type ThinkingLevel = 'lite' | 'standard' | 'advanced' | 'expert' | 'genius' | 'deep_research';

export interface ModelSelectorProps {
    value: ThinkingLevel;
    onChange: (v: ThinkingLevel) => void;
    userPlan?: string;
    unlockResearch?: boolean; // Super User / Global unlock override
    isSuperUser?: boolean; // Super user gets access to all models
    isPublic?: boolean; // Public user (not logged in)
}

export function ModelSelector({ value, onChange, userPlan = 'free', unlockResearch = false, isSuperUser = false, isPublic = false }: ModelSelectorProps) {
    const isPaid = userPlan !== 'free' || isSuperUser;

    const options: Record<ThinkingLevel, { label: string, desc: string, icon: any, locked?: boolean }> = {
        lite: { label: 'Lite', desc: 'Ultra-fast responses', icon: Leaf },
        standard: { label: 'Standard', desc: 'Balanced speed & quality', icon: Zap, locked: !isPaid },
        advanced: { label: 'Advanced', desc: 'Complex reasoning', icon: Brain, locked: !isPaid },
        expert: { label: 'Reasoning', desc: 'Step-by-step analysis', icon: Sparkles, locked: !isSuperUser },
        genius: { label: 'Genius', desc: 'Maximum intelligence', icon: Rocket, locked: !isSuperUser },
        deep_research: { label: 'Deep Research', desc: 'Comprehensive web analysis', icon: Globe, locked: !isSuperUser && !unlockResearch },
    };

    const SelectedIcon = options[value].icon;
    const lockedMessage = isPublic ? 'Login to access this model' : 'Upgrade to access this model';

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
                            {opt.locked ? lockedMessage : opt.desc}
                        </span>
                    </DropdownMenuItem>
                ))}
                {isPublic && (
                     <div className="p-2 bg-muted/30 text-[10px] text-muted-foreground text-center border-t mt-1">
                        <a href="/login" className="underline">Login</a> or <a href="/signup" className="underline">Sign up</a> for full access.
                     </div>
                )}
                {!isPaid && !isPublic && (
                     <div className="p-2 bg-muted/30 text-[10px] text-muted-foreground text-center border-t mt-1">
                        Upgrade plan to unlock Standard, Advanced & higher models.
                     </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

