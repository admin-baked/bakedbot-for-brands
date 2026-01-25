'use client';

/**
 * Projects Header Component
 *
 * Header section with title, search input, filter toggle, and new project button.
 */

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import type { ProjectFilter } from '@/types/project';
import { cn } from '@/lib/utils';

interface ProjectsHeaderProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    filter: ProjectFilter;
    onFilterChange: (filter: ProjectFilter) => void;
    hasSystemProjects: boolean;
    onNewProject: () => void;
}

export function ProjectsHeader({
    searchQuery,
    onSearchChange,
    filter,
    onFilterChange,
    hasSystemProjects,
    onNewProject,
}: ProjectsHeaderProps) {
    return (
        <div className="space-y-4">
            {/* Title Row */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
                    <p className="text-muted-foreground text-sm">
                        Organize your AI workspaces with dedicated context and instructions.
                    </p>
                </div>
                <Button
                    onClick={onNewProject}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
                >
                    <Plus className="h-4 w-4" />
                    New Project
                </Button>
            </div>

            {/* Search and Filter Row */}
            <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Filter Toggle */}
                {hasSystemProjects && (
                    <div className="glass-card p-1 rounded-lg flex items-center">
                        <button
                            onClick={() => onFilterChange('my')}
                            className={cn(
                                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                                filter === 'my'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            My Projects
                        </button>
                        <button
                            onClick={() => onFilterChange('system')}
                            className={cn(
                                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                                filter === 'system'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            System Projects
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProjectsHeader;
