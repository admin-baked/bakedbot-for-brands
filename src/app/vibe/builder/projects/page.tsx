'use client';

/**
 * Vibe Builder - Project List
 *
 * Shows all user's website projects with options to edit, duplicate, or delete
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Plus, Eye, Copy, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  getUserVibeProjects,
  deleteVibeProject,
  createVibeProject,
  getVibeProject,
} from '@/server/actions/vibe-projects';
import type { VibeProjectListItem } from '@/types/vibe-project';

export default function ProjectsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [projects, setProjects] = useState<VibeProjectListItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'draft' | 'published' | 'archived'
  >('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  // Require authentication
  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to view your projects',
        variant: 'destructive',
      });
      router.push('/signup?redirect=/vibe/builder/projects');
    }
  }, [user, loading, router, toast]);

  // Load projects
  useEffect(() => {
    async function loadProjects() {
      if (!user) return;

      try {
        const fetchedProjects = await getUserVibeProjects(
          user.uid,
          filterStatus === 'all' ? undefined : filterStatus
        );
        setProjects(fetchedProjects);
      } catch (error) {
        console.error('Failed to load projects:', error);
        toast({
          title: 'Error',
          description: 'Failed to load projects',
          variant: 'destructive',
        });
      } finally {
        setLoadingProjects(false);
      }
    }

    loadProjects();
  }, [user, filterStatus, toast]);

  const handleNewProject = () => {
    router.push('/vibe/builder');
  };

  const handleEditProject = (projectId: string) => {
    router.push(`/vibe/builder?projectId=${projectId}`);
  };

  const handleDuplicateProject = async (projectId: string) => {
    if (!user) return;

    setDuplicating(projectId);
    try {
      // Get the original project
      const original = await getVibeProject(projectId);
      if (!original) {
        throw new Error('Project not found');
      }

      // Create a duplicate
      const result = await createVibeProject({
        userId: user.uid,
        name: `${original.name} (Copy)`,
        description: original.description,
        html: original.html,
        css: original.css,
        components: original.components,
        styles: original.styles,
        status: 'draft',
        visibility: 'private',
      });

      if (result.success && result.projectId) {
        toast({
          title: 'Project Duplicated',
          description: 'The project has been duplicated successfully',
        });

        // Refresh project list
        const fetchedProjects = await getUserVibeProjects(
          user.uid,
          filterStatus === 'all' ? undefined : filterStatus
        );
        setProjects(fetchedProjects);
      } else {
        throw new Error(result.error || 'Failed to duplicate project');
      }
    } catch (error) {
      toast({
        title: 'Duplication Failed',
        description: 'Could not duplicate the project',
        variant: 'destructive',
      });
    } finally {
      setDuplicating(null);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete || !user) return;

    try {
      const result = await deleteVibeProject(projectToDelete);

      if (result.success) {
        toast({
          title: 'Project Deleted',
          description: 'The project has been deleted',
        });

        // Refresh project list
        const fetchedProjects = await getUserVibeProjects(
          user.uid,
          filterStatus === 'all' ? undefined : filterStatus
        );
        setProjects(fetchedProjects);
      } else {
        throw new Error(result.error || 'Failed to delete project');
      }
    } catch (error) {
      toast({
        title: 'Deletion Failed',
        description: 'Could not delete the project',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const openDeleteDialog = (projectId: string) => {
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  // Filter projects by search query
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || loadingProjects) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirecting
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Projects</h1>
              <p className="text-muted-foreground mt-1">
                Manage your website projects
              </p>
            </div>
            <Button onClick={handleNewProject} size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              New Project
            </Button>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterStatus === 'draft' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('draft')}
                size="sm"
              >
                Drafts
              </Button>
              <Button
                variant={filterStatus === 'published' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('published')}
                size="sm"
              >
                Published
              </Button>
              <Button
                variant={filterStatus === 'archived' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('archived')}
                size="sm"
              >
                Archived
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Project Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Create your first website project to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={handleNewProject} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="flex flex-col">
                <CardHeader>
                  <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No preview
                      </div>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-xl truncate">
                      {project.name}
                    </CardTitle>
                    <Badge
                      variant={
                        project.status === 'published'
                          ? 'default'
                          : project.status === 'draft'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    Updated{' '}
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto flex gap-2">
                  <Button
                    onClick={() => handleEditProject(project.id)}
                    className="flex-1"
                    size="sm"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDuplicateProject(project.id)}
                    variant="outline"
                    size="sm"
                    disabled={duplicating === project.id}
                  >
                    {duplicating === project.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    onClick={() => openDeleteDialog(project.id)}
                    variant="outline"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              project and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
