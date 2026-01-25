'use client';

/**
 * Help Button Component
 *
 * Floating help button fixed to bottom-right corner.
 */

import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface HelpButtonProps {
    href?: string;
}

export function HelpButton({ href = 'https://docs.bakedbot.ai/projects' }: HelpButtonProps) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="fixed bottom-6 right-6 rounded-full h-12 w-12 glass-card glass-card-hover shadow-lg z-50"
                        onClick={() => {
                            window.open(href, '_blank');
                        }}
                    >
                        <HelpCircle className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                    <p>Need help with Projects?</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export default HelpButton;
