'use client';

/**
 * Playbooks Header
 *
 * Header with title, search, category filter tabs, and new playbook button.
 */

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PlaybookFilterCategory = 'All' | 'Intel' | 'SEO' | 'Ops' | 'Finance' | 'Compliance';

interface PlaybooksHeaderProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    activeFilter: PlaybookFilterCategory;
    onFilterChange: (filter: PlaybookFilterCategory) => void;
    onNewPlaybook?: () => void;
    newPlaybookButton?: ReactNode;
}

const FILTERS: PlaybookFilterCategory[] = ['All', 'Intel', 'SEO', 'Ops', 'Finance', 'Compliance'];

export function PlaybooksHeader({
    searchQuery,
    onSearchChange,
    activeFilter,
    onFilterChange,
    onNewPlaybook,
    newPlaybookButton,
}: PlaybooksHeaderProps) {
    return (
        <div className="space-y-6">
            {/* Title */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Playbooks</h1>
                <p className="text-muted-foreground">Automation recipes for your brand.</p>
            </div>

            {/* Controls Row */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Search */}
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="glass-card p-1 rounded-lg flex items-center">
                    {FILTERS.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => onFilterChange(filter)}
                            className={cn(
                                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                                activeFilter === filter
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                {/* New Playbook Button */}
                {newPlaybookButton ?? (
                    <Button
                        onClick={onNewPlaybook}
                        disabled={!onNewPlaybook}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        New Playbook
                    </Button>
                )}
            </div>
        </div>
    );
}

export default PlaybooksHeader;
