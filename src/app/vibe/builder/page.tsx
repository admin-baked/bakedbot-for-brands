'use client';

/**
 * Vibe Builder - Visual Website Builder
 *
 * Drag-and-drop interface for building cannabis websites without code.
 * Powered by GrapesJS with custom blocks and POS integration.
 */

import './builder.css';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { BuilderCanvas } from './components/builder-canvas';
import { BuilderTopBar } from './components/builder-top-bar';
import { useToast } from '@/hooks/use-toast';
import {
  createVibeProject,
  getVibeProject,
  updateVibeProject,
  autoSaveVibeProject,
} from '@/server/actions/vibe-projects';
import type { VibeProject } from '@/types/vibe-project';

export default function VibeBuilderPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<VibeProject | null>(null);
  const [projectName, setProjectName] = useState('My Dispensary');
  const [saving, setSaving] = useState(false);
  const [loadingProject, setLoadingProject] = useState(true);

  // Store editor instance ref (will be set by BuilderCanvas)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);

  // Require authentication
  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to use Vibe Builder',
        variant: 'destructive',
      });
      router.push('/signup?redirect=/vibe/builder');
    }
  }, [user, loading, router, toast]);

  // Load or create project
  useEffect(() => {
    async function initProject() {
      if (!user) return;

      const urlProjectId = searchParams.get('projectId');

      try {
        if (urlProjectId) {
          // Load existing project
          const existingProject = await getVibeProject(urlProjectId);
          if (existingProject && existingProject.userId === user.uid) {
            setProject(existingProject);
            setProjectId(existingProject.id);
            setProjectName(existingProject.name);
          } else {
            toast({
              title: 'Project Not Found',
              description: 'Creating a new project instead',
              variant: 'destructive',
            });
            await createNewProject();
          }
        } else {
          // Create new project
          await createNewProject();
        }
      } catch (error) {
        console.error('Failed to init project:', error);
        toast({
          title: 'Error',
          description: 'Failed to initialize project',
          variant: 'destructive',
        });
      } finally {
        setLoadingProject(false);
      }
    }

    async function createNewProject() {
      if (!user) return;

      const result = await createVibeProject({
        userId: user.uid,
        name: 'My Dispensary',
        html: '',
        css: '',
        components: '[]',
        styles: '[]',
        status: 'draft',
        visibility: 'private',
      });

      if (result.success && result.projectId) {
        setProjectId(result.projectId);
        // Update URL with projectId
        router.replace(`/vibe/builder?projectId=${result.projectId}`);
      }
    }

    initProject();
  }, [user, searchParams, router, toast]);

  // Save editor data
  const handleSave = useCallback(async () => {
    if (!projectId || !editorRef.current) return;

    setSaving(true);
    try {
      const editor = editorRef.current;

      await updateVibeProject(projectId, {
        name: projectName,
        html: editor.getHtml(),
        css: editor.getCss(),
        components: JSON.stringify(editor.getComponents()),
        styles: JSON.stringify(editor.getStyle()),
      });

      toast({
        title: 'Project Saved',
        description: 'Your changes have been saved',
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Could not save your project',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [projectId, projectName, toast]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!projectId || !editorRef.current) return;

    const interval = setInterval(async () => {
      if (editorRef.current) {
        const editor = editorRef.current;
        await autoSaveVibeProject(projectId, {
          html: editor.getHtml(),
          css: editor.getCss(),
          components: JSON.stringify(editor.getComponents()),
          styles: JSON.stringify(editor.getStyle()),
        });
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [projectId]);

  const handlePreview = () => {
    // TODO: Implement preview
    toast({
      title: 'Preview',
      description: 'Preview functionality coming soon',
    });
  };

  const handlePublish = () => {
    // TODO: Implement publish
    router.push('/vibe/builder/publish');
  };

  if (loading || loadingProject) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : 'Initializing project...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user || !projectId) {
    return null; // Redirecting
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top Bar */}
      <BuilderTopBar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        onSave={handleSave}
        onPreview={handlePreview}
        onPublish={handlePublish}
        saving={saving}
      />

      {/* Main Builder Canvas */}
      <BuilderCanvas
        userId={user.uid}
        projectId={projectId}
        projectName={projectName}
        initialProject={project}
        onEditorReady={(editor) => {
          editorRef.current = editor;
        }}
      />
    </div>
  );
}
