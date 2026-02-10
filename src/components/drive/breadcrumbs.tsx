'use client';

/**
 * Drive Breadcrumbs Component
 *
 * Navigation breadcrumbs showing current folder path.
 */

import { useDriveStore } from '@/lib/store/drive-store';
import { ChevronRight, HardDrive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DriveBreadcrumbs() {
  const { breadcrumbs, navigateToFolder, navigateToBreadcrumb, isTrashViewOpen, closeTrashView } =
    useDriveStore();

  if (isTrashViewOpen) {
    return (
      <div className="flex items-center gap-1 px-4 py-2 border-b text-sm">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={closeTrashView}
        >
          <HardDrive className="h-4 w-4 mr-1" />
          BakedBot Drive
        </Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-1 text-muted-foreground">
          <Trash2 className="h-4 w-4" />
          <span>Trash</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b text-sm overflow-x-auto">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 shrink-0"
        onClick={() => navigateToFolder(null)}
      >
        <HardDrive className="h-4 w-4 mr-1" />
        BakedBot Drive
      </Button>

      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.id} className="flex items-center gap-1 shrink-0">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          {index === breadcrumbs.length - 1 ? (
            <span className="text-muted-foreground">{crumb.name}</span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => navigateToBreadcrumb(crumb)}
            >
              {crumb.name}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
