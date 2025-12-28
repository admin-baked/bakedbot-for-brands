'use client';

/**
 * Project Selector Component
 * 
 * Dropdown for selecting a project context in agent chat.
 * When a project is selected, its system instructions and KB are included in prompts.
 */

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
    FolderKanban, 
    ChevronDown, 
    Plus, 
    Check,
    X
} from "lucide-react";
import { Project } from "@/types/project";
import { getProjects } from "@/server/actions/projects";
import Link from "next/link";

interface ProjectSelectorProps {
    selectedProjectId?: string | null;
    onProjectChange: (project: Project | null) => void;
    className?: string;
}

export function ProjectSelector({ 
    selectedProjectId, 
    onProjectChange,
    className 
}: ProjectSelectorProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    useEffect(() => {
        async function loadProjects() {
            try {
                const data = await getProjects();
                setProjects(data);
                
                // If a project was pre-selected, find it
                if (selectedProjectId) {
                    const found = data.find(p => p.id === selectedProjectId);
                    if (found) {
                        setSelectedProject(found);
                    }
                }
            } catch (error) {
                console.error('Failed to load projects:', error);
            } finally {
                setLoading(false);
            }
        }
        loadProjects();
    }, [selectedProjectId]);

    const handleSelect = (project: Project | null) => {
        setSelectedProject(project);
        onProjectChange(project);
    };

    if (loading) {
        return (
            <Button variant="ghost" size="sm" disabled className={className}>
                <FolderKanban className="h-4 w-4 mr-2 animate-pulse" />
                Loading...
            </Button>
        );
    }

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button 
                        variant={selectedProject ? "secondary" : "ghost"} 
                        size="sm" 
                        className="gap-2"
                    >
                        <FolderKanban 
                            className="h-4 w-4" 
                            style={{ color: selectedProject?.color }}
                        />
                        {selectedProject ? selectedProject.name : 'No Project'}
                        <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[240px]">
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                        Project Context
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {/* No Project Option */}
                    <DropdownMenuItem 
                        onClick={() => handleSelect(null)}
                        className="gap-2"
                    >
                        <div className="h-3 w-3 rounded-full border border-dashed" />
                        <span className="flex-1">No Project</span>
                        {!selectedProject && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    {/* Project List */}
                    {projects.length > 0 ? (
                        projects.slice(0, 5).map((project) => (
                            <DropdownMenuItem 
                                key={project.id}
                                onClick={() => handleSelect(project)}
                                className="gap-2"
                            >
                                <div 
                                    className="h-3 w-3 rounded-full shrink-0" 
                                    style={{ backgroundColor: project.color }}
                                />
                                <span className="flex-1 truncate">{project.name}</span>
                                {selectedProject?.id === project.id && (
                                    <Check className="h-4 w-4 text-primary" />
                                )}
                            </DropdownMenuItem>
                        ))
                    ) : (
                        <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                            No projects yet
                        </div>
                    )}
                    
                    {projects.length > 5 && (
                        <DropdownMenuItem asChild>
                            <Link href="/dashboard/projects" className="gap-2 text-xs">
                                View all {projects.length} projects...
                            </Link>
                        </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    
                    {/* Create New */}
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/projects" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Project
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear Button when project is selected */}
            {selectedProject && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => handleSelect(null)}
                >
                    <X className="h-3 w-3" />
                </Button>
            )}
        </div>
    );
}

/**
 * Compact version for inline display
 */
export function ProjectBadge({ project }: { project: Project }) {
    return (
        <div 
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-muted"
            style={{ borderLeft: `3px solid ${project.color}` }}
        >
            <FolderKanban className="h-3 w-3" style={{ color: project.color }} />
            {project.name}
        </div>
    );
}
