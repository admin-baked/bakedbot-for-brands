/**
 * Vibe Project Types
 *
 * Type definitions for visual website builder projects
 */

export interface VibeProject {
  id: string;
  userId: string;
  name: string;
  description?: string;

  // GrapesJS data
  html: string; // editor.getHtml()
  css: string; // editor.getCss()
  components: string; // JSON.stringify(editor.getComponents())
  styles: string; // JSON.stringify(editor.getStyle())

  // Metadata
  thumbnail?: string; // Preview screenshot URL
  status: 'draft' | 'published' | 'archived';
  visibility: 'private' | 'unlisted' | 'public';

  // POS Integration
  connectedPOS?: {
    type: 'alleaves' | 'dutchie' | 'jane' | 'treez';
    orgId: string;
    syncEnabled: boolean;
  };

  // Publishing
  publishedUrl?: string; // Custom domain or bakedbot subdomain
  lastPublishedAt?: string;
  customDomain?: string; // User's custom domain
  customDomainVerified?: boolean; // DNS verification status

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastEditedAt: string;

  // Auto-save tracking
  hasUnsavedChanges?: boolean;
  lastAutoSaveAt?: string;
}

export type CreateVibeProjectInput = Omit<
  VibeProject,
  'id' | 'createdAt' | 'updatedAt' | 'lastEditedAt'
>;

export type UpdateVibeProjectInput = Partial<
  Omit<VibeProject, 'id' | 'userId' | 'createdAt'>
>;

/**
 * Project list item (lightweight version for list views)
 */
export interface VibeProjectListItem {
  id: string;
  name: string;
  thumbnail?: string;
  status: 'draft' | 'published' | 'archived';
  updatedAt: string;
  lastEditedAt: string;
}
