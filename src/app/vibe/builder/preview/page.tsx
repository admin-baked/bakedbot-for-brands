'use client';

/**
 * Vibe Builder - Preview Mode
 *
 * Full-screen preview of the website without editor UI
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, X, Monitor, Smartphone, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getVibeProject } from '@/server/actions/vibe-projects';
import type { VibeProject } from '@/types/vibe-project';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export default function PreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [project, setProject] = useState<VibeProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');

  useEffect(() => {
    async function loadProject() {
      const projectId = searchParams.get('projectId');

      if (!projectId) {
        toast({
          title: 'No Project',
          description: 'No project ID provided',
          variant: 'destructive',
        });
        router.push('/vibe/builder/projects');
        return;
      }

      try {
        const fetchedProject = await getVibeProject(projectId);

        if (!fetchedProject) {
          toast({
            title: 'Project Not Found',
            description: 'The project could not be found',
            variant: 'destructive',
          });
          router.push('/vibe/builder/projects');
          return;
        }

        setProject(fetchedProject);
      } catch (error) {
        console.error('Failed to load project:', error);
        toast({
          title: 'Error',
          description: 'Failed to load project preview',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [searchParams, router, toast]);

  const handleClose = () => {
    const projectId = searchParams.get('projectId');
    if (projectId) {
      router.push(`/vibe/builder?projectId=${projectId}`);
    } else {
      router.push('/vibe/builder/projects');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name}</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css" rel="stylesheet">
  <style>
    ${project.css}
  </style>
</head>
<body>
  ${project.html}
</body>
</html>
  `.trim();

  return (
    <div className="h-screen flex flex-col bg-muted">
      {/* Preview Header */}
      <div className="bg-background border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Close Preview
          </Button>

          <div className="h-6 w-px bg-border" />

          <span className="text-sm font-medium">{project.name}</span>
        </div>

        {/* Device Toggles */}
        <div className="flex items-center gap-2">
          <Button
            variant={deviceMode === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDeviceMode('desktop')}
          >
            <Monitor className="w-4 h-4" />
          </Button>
          <Button
            variant={deviceMode === 'tablet' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDeviceMode('tablet')}
          >
            <Tablet className="w-4 h-4" />
          </Button>
          <Button
            variant={deviceMode === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDeviceMode('mobile')}
          >
            <Smartphone className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preview Frame */}
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="mx-auto h-full" style={getDeviceStyles(deviceMode)}>
          <div className="h-full bg-white rounded-lg shadow-2xl overflow-hidden">
            <iframe
              srcDoc={fullHTML}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function getDeviceStyles(mode: DeviceMode): React.CSSProperties {
  switch (mode) {
    case 'mobile':
      return {
        maxWidth: '375px',
        width: '100%',
      };
    case 'tablet':
      return {
        maxWidth: '768px',
        width: '100%',
      };
    case 'desktop':
    default:
      return {
        maxWidth: '100%',
        width: '100%',
      };
  }
}
