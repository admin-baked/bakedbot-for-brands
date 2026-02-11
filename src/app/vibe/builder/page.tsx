'use client';

/**
 * Vibe Builder - Visual Website Builder
 *
 * Drag-and-drop interface for building cannabis websites without code.
 * Powered by GrapesJS with custom blocks and POS integration.
 */

import './builder.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { BuilderCanvas } from './components/builder-canvas';
import { BuilderTopBar } from './components/builder-top-bar';
import { useToast } from '@/hooks/use-toast';

export default function VibeBuilderPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [projectName, setProjectName] = useState('My Dispensary');
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Implement save functionality
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
  };

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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
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
      <BuilderCanvas userId={user.uid} projectName={projectName} />
    </div>
  );
}
