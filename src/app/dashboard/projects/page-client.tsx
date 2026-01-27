'use client';

/**
 * Projects Page Client
 *
 * Client-side wrapper managing search, filter state, and rendering the projects grid.
 */

import { useState, useMemo } from 'react';
import { Project, ProjectFilter } from '@/types/project';
import { ProjectCard } from './components/project-card';
import { ProjectsHeader } from './components/projects-header';
import { HelpButton } from './components/help-button';
import { NewProjectButton } from './components/new-project-button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { InboxCTABanner } from '@/components/inbox';

interface ProjectsPageClientProps {
    projects: Project[];
    currentUserId: string;
}

export function ProjectsPageClient({ projects, currentUserId }: ProjectsPageClientProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<ProjectFilter>('my');
    const router = useRouter();
    const { toast } = useToast();

    // Determine if there are system (shared) projects
    const hasSystemProjects = useMemo(
        () => projects.some((p) => p.isShared || p.ownerId !== currentUserId),
        [projects, currentUserId]
    );

    // Filter and search projects
    const filteredProjects = useMemo(() => {
        let result = projects;

        // Apply filter
        if (filter === 'my') {
            result = result.filter((p) => p.ownerId === currentUserId);
        } else {
            result = result.filter((p) => p.isShared || p.ownerId !== currentUserId);
        }

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (p) =>
                    p.name.toLowerCase().includes(query) ||
                    p.description?.toLowerCase().includes(query) ||
                    p.systemInstructions?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [projects, filter, searchQuery, currentUserId]);

    const handleEdit = (project: Project) => {
        router.push(`/dashboard/projects/${project.id}?edit=true`);
    };

    const handleDuplicate = async (project: Project) => {
        // TODO: Implement duplicate via server action
        toast({
            title: 'Coming soon',
            description: 'Project duplication will be available soon.',
        });
    };

    const handleArchive = async (project: Project) => {
        // TODO: Implement archive via server action
        toast({
            title: 'Coming soon',
            description: 'Project archiving will be available soon.',
        });
    };

    const handleNewProject = () => {
        // NewProjectButton handles this with dialog, but we provide the callback
        // for potential programmatic triggering
    };

    return (
        <div className="p-6 space-y-6">
            <ProjectsHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filter={filter}
                onFilterChange={setFilter}
                hasSystemProjects={hasSystemProjects}
                onNewProject={handleNewProject}
            />

            {/* Inbox CTA Banner */}
            <InboxCTABanner variant="projects" />

            {/* Projects Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* New Project Card */}
                <NewProjectButton asCard />

                {/* Project Cards */}
                {filteredProjects.map((project) => (
                    <ProjectCard
                        key={project.id}
                        project={project}
                        isOwner={project.ownerId === currentUserId}
                        onEdit={handleEdit}
                        onDuplicate={handleDuplicate}
                        onArchive={handleArchive}
                    />
                ))}
            </div>

            {/* Empty States */}
            {filteredProjects.length === 0 && searchQuery && (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No projects found matching &quot;{searchQuery}&quot;</p>
                </div>
            )}

            {filteredProjects.length === 0 && !searchQuery && filter === 'system' && (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No system projects available</p>
                </div>
            )}

            {filteredProjects.length === 0 && !searchQuery && filter === 'my' && projects.length > 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No projects yet. Create one to get started!</p>
                </div>
            )}

            {/* Help Button */}
            <HelpButton />
        </div>
    );
}

export default ProjectsPageClient;
