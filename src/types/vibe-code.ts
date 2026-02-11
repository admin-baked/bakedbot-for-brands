/**
 * Types for Vibe IDE - Code Generation & WebContainer Integration
 */

export interface VibeCodeFile {
  path: string;
  content: string;
  language: 'typescript' | 'javascript' | 'css' | 'json' | 'html';
}

export interface VibeCodeProject {
  id: string;
  name: string;
  description: string;
  files: VibeCodeFile[];
  dependencies: Record<string, string>;
  vibeConfig: any; // Original theme config
  createdAt: string;
  updatedAt: string;
}

export interface VibeCodeGenerationResult {
  success: boolean;
  project?: VibeCodeProject;
  error?: string;
  reasoning?: string;
}

export interface WebContainerStatus {
  status: 'booting' | 'installing' | 'building' | 'ready' | 'error';
  message?: string;
  previewUrl?: string;
  logs?: string[];
}

export interface CodeExportOptions {
  format: 'zip' | 'github';
  includeNodeModules?: boolean;
  includeReadme?: boolean;
}
