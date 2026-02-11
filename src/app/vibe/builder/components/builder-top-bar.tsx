'use client';

/**
 * Builder Top Bar
 *
 * Fixed header with project controls (save, preview, publish)
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Save,
  Eye,
  Rocket,
  Undo2,
  Redo2,
  Monitor,
  Smartphone,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface BuilderTopBarProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onSave: () => void;
  onPreview: () => void;
  onPublish: () => void;
  saving?: boolean;
}

export function BuilderTopBar({
  projectName,
  onProjectNameChange,
  onSave,
  onPreview,
  onPublish,
  saving = false,
}: BuilderTopBarProps) {
  return (
    <div className="border-b bg-background flex items-center justify-between px-4 py-2 h-14 flex-shrink-0">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <Link href="/vibe/builder/projects">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            My Projects
          </Button>
        </Link>

        <div className="h-8 w-px bg-border" />

        <div className="flex items-center gap-2">
          <Input
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            className="h-8 w-48 text-sm"
            placeholder="Project name"
          />
          <Badge variant="secondary" className="text-xs">
            Builder
          </Badge>
        </div>
      </div>

      {/* Center Section - History Controls */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" disabled>
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" disabled>
          <Redo2 className="w-4 h-4" />
        </Button>

        <div className="h-8 w-px bg-border mx-2" />

        <Button variant="ghost" size="sm">
          <Monitor className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <Smartphone className="w-4 h-4" />
        </Button>
      </div>

      {/* Right Section - Action Buttons */}
      <div className="flex items-center gap-2">
        {saving && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Saving...
          </span>
        )}

        <Button variant="ghost" size="sm" onClick={onSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" />
          Save
        </Button>

        <Button variant="outline" size="sm" onClick={onPreview}>
          <Eye className="w-4 h-4 mr-1" />
          Preview
        </Button>

        <Button size="sm" onClick={onPublish}>
          <Rocket className="w-4 h-4 mr-1" />
          Publish
        </Button>
      </div>
    </div>
  );
}
