'use client';

/**
 * Resource Library Component
 *
 * Displays downloadable resources (checklists, templates, guides) grouped by type.
 * Shows lock icon for email-gated resources.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  FileSpreadsheet,
  BookOpen,
  Download,
  Lock,
  CheckCircle,
} from 'lucide-react';
import type { AcademyResource } from '@/types/academy';

export interface ResourceLibraryProps {
  resources: AcademyResource[];
  onDownload: (resource: AcademyResource) => void;
  hasEmail: boolean;
  downloadedIds?: string[];
}

export function ResourceLibrary({
  resources,
  onDownload,
  hasEmail,
  downloadedIds = [],
}: ResourceLibraryProps) {
  // Group resources by type
  const checklists = resources.filter((r) => r.type === 'checklist');
  const templates = resources.filter((r) => r.type === 'template');
  const guides = resources.filter((r) => r.type === 'guide');

  const getIcon = (type: AcademyResource['type']) => {
    switch (type) {
      case 'checklist':
        return FileText;
      case 'template':
        return FileSpreadsheet;
      case 'guide':
        return BookOpen;
    }
  };

  const getTypeColor = (type: AcademyResource['type']) => {
    switch (type) {
      case 'checklist':
        return 'from-blue-500 to-cyan-600';
      case 'template':
        return 'from-purple-500 to-pink-600';
      case 'guide':
        return 'from-green-500 to-emerald-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* Checklists */}
      {checklists.length > 0 && (
        <ResourceSection
          title="Checklists"
          description="Quick-win PDFs that provide immediate value"
          icon={FileText}
          resources={checklists}
          onDownload={onDownload}
          hasEmail={hasEmail}
          downloadedIds={downloadedIds}
          getIcon={getIcon}
          getTypeColor={getTypeColor}
        />
      )}

      {/* Templates */}
      {templates.length > 0 && (
        <ResourceSection
          title="Templates"
          description="Excel/Google Sheets templates for practical use"
          icon={FileSpreadsheet}
          resources={templates}
          onDownload={onDownload}
          hasEmail={hasEmail}
          downloadedIds={downloadedIds}
          getIcon={getIcon}
          getTypeColor={getTypeColor}
        />
      )}

      {/* Guides */}
      {guides.length > 0 && (
        <ResourceSection
          title="Guides"
          description="In-depth PDF guides for key topics"
          icon={BookOpen}
          resources={guides}
          onDownload={onDownload}
          hasEmail={hasEmail}
          downloadedIds={downloadedIds}
          getIcon={getIcon}
          getTypeColor={getTypeColor}
        />
      )}
    </div>
  );
}

interface ResourceSectionProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  resources: AcademyResource[];
  onDownload: (resource: AcademyResource) => void;
  hasEmail: boolean;
  downloadedIds: string[];
  getIcon: (type: AcademyResource['type']) => React.ComponentType<{ className?: string }>;
  getTypeColor: (type: AcademyResource['type']) => string;
}

function ResourceSection({
  title,
  description,
  icon: Icon,
  resources,
  onDownload,
  hasEmail,
  downloadedIds,
  getIcon,
  getTypeColor,
}: ResourceSectionProps) {
  return (
    <div>
      {/* Section Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">{title}</h2>
          <Badge variant="secondary">{resources.length}</Badge>
        </div>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {/* Resource Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((resource) => {
          const isLocked = resource.requiresEmail && !hasEmail;
          const isDownloaded = downloadedIds.includes(resource.id);
          const ResourceIcon = getIcon(resource.type);
          const typeColor = getTypeColor(resource.type);

          return (
            <Card
              key={resource.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isLocked ? 'opacity-75' : ''
              }`}
              onClick={() => !isLocked && onDownload(resource)}
            >
              <CardContent className="p-4">
                {/* Resource Icon */}
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 bg-gradient-to-br ${typeColor}`}
                >
                  <ResourceIcon className="h-6 w-6 text-white" />
                </div>

                {/* Title */}
                <h3 className="font-semibold mb-2 line-clamp-2">
                  {resource.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {resource.description}
                </p>

                {/* File Type Badge */}
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="uppercase">
                    {resource.fileType}
                  </Badge>
                  {isDownloaded && (
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircle className="h-3 w-3" />
                      Downloaded
                    </div>
                  )}
                </div>

                {/* Download Button */}
                <Button
                  variant={isLocked ? 'outline' : 'default'}
                  size="sm"
                  className="w-full gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(resource);
                  }}
                >
                  {isLocked ? (
                    <>
                      <Lock className="h-4 w-4" />
                      Email Required
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
