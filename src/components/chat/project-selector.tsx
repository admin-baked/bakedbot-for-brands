'use client';

/**
 * ProjectSelector
 * Dropdown component for selecting a project context in chat.
 * Projects provide custom system instructions to the agent.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FolderKanban, ChevronDown, X, Plus } from 'lucide-react';
import { getProjects } from '@/server/actions/projects';
import type { Project } from '@/types/project';
import Link from 'next/link';

interface ProjectSelectorProps {
    value: string | null;
    onChange: (projectId: string | null) => void;
    disabled?: boolean;
}

const STORAGE_KEY = 'bakedbot_selected_project';

export function ProjectSelector({ value, onChange, disabled }: ProjectSelectorProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // Fetch projects on mount
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const data = await getProjects();
                setProjects(data);
                
                // Restore persisted selection
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored && data.some(p => p.id === stored)) {
                    onChange(stored);
                }
            } catch (error) {
                console.error('Failed to fetch projects:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    // Update selected project when value changes
    useEffect(() => {
        if (value) {
            const project = projects.find(p => p.id === value);
            setSelectedProject(project || null);
            localStorage.setItem(STORAGE_KEY, value);
        } else {
            setSelectedProject(null);
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [value, projects]);

    const handleSelect = (projectId: string | null) => {
        onChange(projectId);
    };

    if (loading) {
        return (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled>
                <FolderKanban className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Loading...</span>
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs gap-1"
                    disabled={disabled}
                >
                    <FolderKanban 
                        className="h-3.5 w-3.5" 
                        style={{ color: selectedProject?.color }}
                    />
                    <span className="hidden sm:inline max-w-[80px] truncate">
                        {selectedProject?.name || 'No Project'}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Project Context
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* No Project Option */}
                <DropdownMenuItem 
                    onClick={() => handleSelect(null)}
                    className="text-xs"
                >
                    <X className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    <span>No Project</span>
                    {!selectedProject && (
                        <span className="ml-auto text-primary">✓</span>
                    )}
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />

                {/* Project List */}
                {projects.length === 0 ? (
                    <div className="px-2 py-3 text-center">
                        <p className="text-xs text-muted-foreground mb-2">
                            No projects yet
                        </p>
                        <Link href="/dashboard/projects">
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                                <Plus className="h-3 w-3 mr-1" />
                                Create Project
                            </Button>
                        </Link>
                    </div>
                ) : (
                    projects.map((project) => (
                        <DropdownMenuItem
                            key={project.id}
                            onClick={() => handleSelect(project.id)}
                            className="text-xs"
                        >
                            <FolderKanban 
                                className="h-3.5 w-3.5 mr-2" 
                                style={{ color: project.color }}
                            />
                            <span className="truncate flex-1">{project.name}</span>
                            {selectedProject?.id === project.id && (
                                <span className="ml-auto text-primary">✓</span>
                            )}
                        </DropdownMenuItem>
                    ))
                )}
                
                {projects.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <Link href="/dashboard/projects">
                            <DropdownMenuItem className="text-xs text-muted-foreground">
                                <Plus className="h-3.5 w-3.5 mr-2" />
                                Manage Projects
                            </DropdownMenuItem>
                        </Link>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
