'use client';

/**
 * Vibe Code Preview Component
 *
 * Split view with Monaco code editor on the left and live preview iframe on the right.
 * Supports file switching, code editing, and real-time preview updates via WebContainer.
 */

import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Code2,
  Eye,
  FileCode,
  Download,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { VibeCodeProject, VibeCodeFile } from '@/types/vibe-code';
import { setupProject } from '@/lib/webcontainer-service';
import type { WebContainer } from '@webcontainer/api';

interface VibeCodePreviewProps {
  project: VibeCodeProject;
  onFileUpdate?: (path: string, content: string) => void;
  onExport?: () => void;
}

export function VibeCodePreview({ project, onFileUpdate, onExport }: VibeCodePreviewProps) {
  const [currentFile, setCurrentFile] = useState<VibeCodeFile>(project.files[0]);
  const [fileContent, setFileContent] = useState(currentFile.content);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [container, setContainer] = useState<WebContainer | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [view, setView] = useState<'split' | 'code' | 'preview'>('split');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const setupInitiated = useRef(false);

  // Initialize WebContainer on mount
  useEffect(() => {
    if (!setupInitiated.current) {
      setupInitiated.current = true;
      initializePreview();
    }
  }, []);

  async function initializePreview() {
    setStatus('loading');
    try {
      const result = await setupProject(
        project,
        (statusMsg) => {
          setStatusMessage(statusMsg);
        },
        (output) => {
          setLogs((prev) => [...prev.slice(-50), output]); // Keep last 50 logs
        }
      );

      setContainer(result.container);
      setPreviewUrl(result.previewUrl);
      setStatus('ready');
      setStatusMessage('Preview ready!');
    } catch (error) {
      console.error('Failed to initialize preview:', error);
      setStatus('error');
      setStatusMessage('Failed to start preview');
    }
  }

  // Handle file selection
  const handleFileSelect = (filePath: string) => {
    const file = project.files.find((f) => f.path === filePath);
    if (file) {
      setCurrentFile(file);
      setFileContent(file.content);
    }
  };

  // Handle code changes
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setFileContent(value);
      // Debounce updates to WebContainer and parent component
      if (onFileUpdate) {
        onFileUpdate(currentFile.path, value);
      }
    }
  };

  // Get editor language
  const getEditorLanguage = (lang: string) => {
    if (lang === 'typescript') return 'typescript';
    if (lang === 'javascript') return 'javascript';
    if (lang === 'css') return 'css';
    if (lang === 'json') return 'json';
    return 'html';
  };

  // Group files by directory
  const groupedFiles = project.files.reduce((acc, file) => {
    const dir = file.path.includes('/') ? file.path.split('/')[0] : 'root';
    if (!acc[dir]) acc[dir] = [];
    acc[dir].push(file);
    return acc;
  }, {} as Record<string, VibeCodeFile[]>);

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            {status === 'ready' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
            <div>
              <p className="font-medium">{project.name}</p>
              <p className="text-sm text-muted-foreground">{statusMessage}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{project.files.length} files</Badge>
            {previewUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open in New Tab
                </a>
              </Button>
            )}
            <Button variant="default" size="sm" onClick={onExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export ZIP
            </Button>
          </div>
        </div>
      </Card>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="split" className="gap-2">
              <Code2 className="h-4 w-4" />
              Split View
            </TabsTrigger>
            <TabsTrigger value="code" className="gap-2">
              <FileCode className="h-4 w-4" />
              Code Only
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview Only
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Code Editor */}
        {(view === 'split' || view === 'code') && (
          <Card className="overflow-hidden">
            <div className="border-b p-2 bg-muted/30">
              <Select value={currentFile.path} onValueChange={handleFileSelect}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupedFiles).map(([dir, files]) => (
                    <div key={dir}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {dir}
                      </div>
                      {files.map((file) => (
                        <SelectItem key={file.path} value={file.path}>
                          {file.path}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="h-[600px]">
              <Editor
                height="100%"
                language={getEditorLanguage(currentFile.language)}
                value={fileContent}
                onChange={handleEditorChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                }}
              />
            </div>
          </Card>
        )}

        {/* Live Preview */}
        {(view === 'split' || view === 'preview') && (
          <Card className="overflow-hidden">
            <div className="border-b p-2 bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Live Preview</span>
                {status === 'ready' && (
                  <Badge variant="secondary" className="gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (iframeRef.current) {
                    iframeRef.current.src = previewUrl || '';
                  }
                }}
                className="gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Reload
              </Button>
            </div>
            <div className="h-[600px] bg-white">
              {status === 'loading' && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">{statusMessage}</p>
                  </div>
                </div>
              )}
              {status === 'ready' && previewUrl && (
                <iframe
                  ref={iframeRef}
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              )}
              {status === 'error' && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-2">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                    <p className="text-muted-foreground">{statusMessage}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Console Logs (Collapsible) */}
      {logs.length > 0 && (
        <Card className="p-4">
          <details>
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              Console Logs ({logs.length})
            </summary>
            <div className="mt-2 p-3 bg-black text-green-400 rounded font-mono text-xs max-h-40 overflow-auto">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </details>
        </Card>
      )}
    </div>
  );
}
