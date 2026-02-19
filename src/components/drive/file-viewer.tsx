'use client';

/**
 * Drive File Viewer
 *
 * Slide-in Sheet for viewing (and later editing) files stored in BakedBot Drive.
 * Supports: Markdown, plain text, JSON, images, PDF, and unknown files.
 * Fetches content from Firebase Storage download URL — no backend call needed.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { DriveFile } from '@/types/drive';
import { formatFileSize } from '@/types/drive';
import {
  Download,
  Loader2,
  AlertCircle,
  FileText,
  FileCode,
  FileJson,
  Image as ImageIcon,
  File,
  Pencil,
  X,
  Check,
  Eye,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  ListChecks,
  Lightbulb,
  MessageSquare,
  Wand2,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { updateFileContent, aiProcessFile, type AiFileAction } from '@/server/actions/drive-content';
import NextImage from 'next/image';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getViewerType(
  file: DriveFile
): 'image' | 'pdf' | 'markdown' | 'json' | 'text' | 'unknown' {
  const mime = file.mimeType ?? '';
  const name = file.name ?? '';

  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'application/json' || name.endsWith('.json')) return 'json';
  if (
    mime === 'text/markdown' ||
    name.endsWith('.md') ||
    name.endsWith('.mdx')
  )
    return 'markdown';
  if (mime.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.csv'))
    return 'text';
  return 'unknown';
}

function mimeLabel(file: DriveFile): string {
  const name = file.name ?? '';
  if (name.endsWith('.md')) return 'Markdown';
  if (name.endsWith('.json')) return 'JSON';
  if (name.endsWith('.txt')) return 'Text';
  if (name.endsWith('.csv')) return 'CSV';
  const mime = file.mimeType ?? '';
  if (mime.startsWith('image/')) return mime.replace('image/', '').toUpperCase();
  if (mime === 'application/pdf') return 'PDF';
  return mime || 'File';
}

/**
 * Minimal markdown → HTML renderer.
 * Handles: headings, bold, italic, inline code, hr, blockquote, lists, paragraphs.
 * Content originates from our own Firebase Storage — no XSS risk.
 */
function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw;

    // Headings
    if (line.startsWith('#### ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h4>${fmt(line.slice(5))}</h4>`);
      continue;
    }
    if (line.startsWith('### ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h3>${fmt(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h2>${fmt(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h1>${fmt(line.slice(2))}</h1>`);
      continue;
    }

    // HR
    if (/^---+$/.test(line.trim())) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<hr />');
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<blockquote>${fmt(line.slice(2))}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^[-*] /.test(line)) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${fmt(line.slice(2))}</li>`);
      continue;
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<li>${fmt(line.replace(/^\d+\. /, ''))}</li>`);
      continue;
    }

    // End list on blank line
    if (line.trim() === '') {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<br />');
      continue;
    }

    if (inList) { out.push('</ul>'); inList = false; }
    out.push(`<p>${fmt(line)}</p>`);
  }

  if (inList) out.push('</ul>');
  return out.join('\n');
}

/** Inline formatting: bold, italic, inline code, links */
function fmt(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ImageViewer({ file }: { file: DriveFile }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px] bg-muted/30 rounded-lg p-4">
      <NextImage
        src={file.downloadUrl}
        alt={file.name}
        width={800}
        height={600}
        className="max-w-full max-h-[70vh] object-contain rounded-md shadow-sm"
        unoptimized
      />
    </div>
  );
}

function PdfViewer({ file }: { file: DriveFile }) {
  return (
    <div className="h-[calc(100vh-12rem)]">
      <iframe
        src={file.downloadUrl}
        title={file.name}
        className="w-full h-full rounded-lg border"
      />
    </div>
  );
}

function MarkdownViewer({ content }: { content: string }) {
  return (
    <div
      className="drive-md prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

function JsonViewer({ content }: { content: string }) {
  let formatted = content;
  try {
    formatted = JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    // show raw if invalid JSON
  }
  return (
    <pre className="text-xs font-mono bg-muted/40 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-words leading-5">
      {formatted}
    </pre>
  );
}

function TextViewer({ content }: { content: string }) {
  return (
    <pre className="text-sm font-mono whitespace-pre-wrap break-words leading-6 text-foreground/90">
      {content}
    </pre>
  );
}

function UnknownViewer({ file }: { file: DriveFile }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="p-4 rounded-full bg-muted">
        <File className="h-10 w-10 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium mb-1">{file.name}</p>
        <p className="text-sm text-muted-foreground mb-4">
          This file type cannot be previewed inline.
        </p>
        <Button asChild>
          <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer" download={file.name}>
            <Download className="h-4 w-4 mr-2" />
            Download to open
          </a>
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface FileViewerProps {
  file: DriveFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FileViewer({ file, open, onOpenChange }: FileViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI panel state
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiAction, setAiAction] = useState<AiFileAction | null>(null);
  const [aiQuestion, setAiQuestion] = useState('');

  // Editor state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showPreview, setShowPreview] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const viewerType = file ? getViewerType(file) : 'unknown';
  const needsContent = viewerType === 'markdown' || viewerType === 'json' || viewerType === 'text';
  const isEditable = needsContent; // Images/PDFs not editable

  // Fetch text content when file changes
  useEffect(() => {
    if (!file || !open || !needsContent) {
      setContent(null);
      setError(null);
      setIsEditing(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setContent(null);
    setIsEditing(false);
    setSaveStatus('idle');

    fetch(file.downloadUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? 'Failed to load file');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [file?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enter edit mode
  const handleEdit = () => {
    setEditContent(content ?? '');
    setIsEditing(true);
    setSaveStatus('idle');
    setShowPreview(false);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setShowPreview(false);
    setSaveStatus('idle');
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
  };

  // Save to server
  const handleSave = useCallback(async (contentToSave: string) => {
    if (!file) return;
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const result = await updateFileContent(file.id, contentToSave);
      if (result.success) {
        setContent(contentToSave);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [file]);

  // Auto-save on content change (3s debounce)
  const handleEditChange = (value: string) => {
    setEditContent(value);
    setSaveStatus('idle');
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSave(value);
    }, 3000);
  };

  // Manual save (Ctrl+S or Save button)
  const handleManualSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    handleSave(editContent);
  };

  if (!file) return null;

  const typeIcon = {
    image: <ImageIcon className="h-4 w-4" />,
    pdf: <FileText className="h-4 w-4" />,
    markdown: <FileText className="h-4 w-4" />,
    json: <FileJson className="h-4 w-4" />,
    text: <FileCode className="h-4 w-4" />,
    unknown: <File className="h-4 w-4" />,
  }[viewerType];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[700px] sm:max-w-[700px] flex flex-col p-0 gap-0"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-semibold truncate leading-tight">
                {file.name}
              </SheetTitle>
              <SheetDescription asChild>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {typeIcon}
                    {mimeLabel(file)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(file.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </SheetDescription>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {isEditing ? (
                <>
                  {/* Preview toggle (markdown only) */}
                  {viewerType === 'markdown' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPreview((p) => !p)}
                    >
                      <Eye className="h-4 w-4 mr-1.5" />
                      {showPreview ? 'Edit' : 'Preview'}
                    </Button>
                  )}

                  {/* Save status indicator */}
                  {saveStatus === 'saving' && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving…
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Saved
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Save failed
                    </span>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleManualSave} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1.5" />
                    )}
                    Save
                  </Button>
                </>
              ) : (
                <>
                  {isEditable && (
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                      <Pencil className="h-4 w-4 mr-1.5" />
                      Edit
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={file.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={file.name}
                    >
                      <Download className="h-4 w-4 mr-1.5" />
                      Download
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        <Separator />

        {/* Content area */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading file…</span>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Could not load file: {error}</span>
              </div>
            )}

            {/* Editor mode */}
            {!loading && !error && isEditing && (
              <>
                {/* Markdown: toggle between raw editor and preview */}
                {viewerType === 'markdown' && showPreview ? (
                  <MarkdownViewer content={editContent} />
                ) : (
                  <Textarea
                    value={editContent}
                    onChange={(e) => handleEditChange(e.target.value)}
                    className="min-h-[60vh] font-mono text-sm resize-none border-0 focus-visible:ring-0 p-0 bg-transparent"
                    placeholder="Start typing…"
                    onKeyDown={(e) => {
                      // Ctrl+S / Cmd+S → manual save
                      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault();
                        handleManualSave();
                      }
                    }}
                  />
                )}
              </>
            )}

            {/* Viewers */}
            {!loading && !error && !isEditing && (
              <>
                {viewerType === 'image' && <ImageViewer file={file} />}
                {viewerType === 'pdf' && <PdfViewer file={file} />}
                {viewerType === 'markdown' && content !== null && (
                  <MarkdownViewer content={content} />
                )}
                {viewerType === 'json' && content !== null && (
                  <JsonViewer content={content} />
                )}
                {viewerType === 'text' && content !== null && (
                  <TextViewer content={content} />
                )}
                {viewerType === 'unknown' && <UnknownViewer file={file} />}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer — metadata strip */}
        <div className="px-6 py-3 border-t bg-muted/30 shrink-0">
          <p className="text-xs text-muted-foreground">
            {file.tags && file.tags.length > 0
              ? file.tags.map((t) => `#${t}`).join(' ')
              : 'No tags'}
            {file.category ? ` · ${file.category}` : ''}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
