'use client';

/**
 * Create Playbook Banner
 *
 * Banner card prompting users to create a new playbook.
 */

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreatePlaybookBannerProps {
    onClick: () => void;
}

export function CreatePlaybookBanner({ onClick }: CreatePlaybookBannerProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                'glass-card glass-card-hover',
                'border border-dashed border-border/50',
                'rounded-xl p-6 flex items-center gap-4',
                'cursor-pointer transition-all duration-200'
            )}
        >
            <div className="bg-muted p-3 rounded-lg">
                <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">
                    Create a New Playbook
                </h2>
                <p className="text-muted-foreground">
                    Build a new Playbook to automate via chat.
                </p>
            </div>
        </div>
    );
}

export default CreatePlaybookBanner;
