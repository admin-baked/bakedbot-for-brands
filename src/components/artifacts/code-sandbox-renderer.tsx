'use client';

/**
 * CodeSandboxRenderer
 *
 * Two-pane artifact component:
 *  Left  — Monaco editor (editable code)
 *  Right — Sandboxed iframe live preview
 *
 * Supported languages:
 *  - html      → injected directly as srcdoc
 *  - javascript / js  → wrapped in <html><script> template
 *  - jsx / react      → Babel standalone transpile inside iframe, renders into #root
 *
 * Security: iframe uses sandbox="allow-scripts" — no same-origin, no top navigation.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, RefreshCw, Copy, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SandboxLanguage = 'html' | 'javascript' | 'jsx' | 'css';

export interface CodeSandboxData {
  code: string;
  language: SandboxLanguage;
  title?: string;
  autorun?: boolean;
}

interface CodeSandboxRendererProps {
  data: CodeSandboxData;
  /** Allow saving edited code back (optional) */
  onSave?: (code: string) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// srcdoc builders
// ---------------------------------------------------------------------------

function buildHtmlSrcdoc(code: string): string {
  return code;
}

function buildJsSrcdoc(code: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><style>body{font-family:sans-serif;padding:1rem;}</style></head>
<body>
<div id="root"></div>
<script>
(function(){
  const _logs = [];
  const _origLog = console.log;
  console.log = (...args) => { _origLog(...args); };
  try {
    ${code}
  } catch(e) {
    document.body.innerHTML = '<pre style="color:red;padding:1rem;">' + e.message + '</pre>';
  }
})();
</script>
</body>
</html>`;
}

function buildJsxSrcdoc(code: string): string {
  // Loads Babel standalone via CDN, transforms JSX, renders into #root
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>body{font-family:sans-serif;padding:1rem;margin:0;}</style>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
try {
  ${code}
  if (typeof App !== 'undefined') {
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
  }
} catch(e) {
  document.getElementById('root').innerHTML = '<pre style="color:red">' + e.message + '</pre>';
}
</script>
</body>
</html>`;
}

function buildCssSrcdoc(code: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${code}</style>
</head>
<body>
  <div class="demo">
    <h1>Heading</h1>
    <p>Paragraph text for styling preview.</p>
    <button class="btn">Button</button>
    <ul><li>List item one</li><li>List item two</li></ul>
  </div>
</body>
</html>`;
}

function buildSrcdoc(code: string, language: SandboxLanguage): string {
  switch (language) {
    case 'html':      return buildHtmlSrcdoc(code);
    case 'jsx':       return buildJsxSrcdoc(code);
    case 'css':       return buildCssSrcdoc(code);
    case 'javascript':
    default:          return buildJsSrcdoc(code);
  }
}

function monacoLanguage(lang: SandboxLanguage): string {
  switch (lang) {
    case 'jsx': return 'javascript';
    default:    return lang;
  }
}

const LANG_BADGE: Record<SandboxLanguage, string> = {
  html: 'HTML',
  javascript: 'JS',
  jsx: 'JSX / React',
  css: 'CSS',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CodeSandboxRenderer({
  data,
  onSave,
  className,
}: CodeSandboxRendererProps) {
  const [code, setCode] = useState(data.code);
  const [srcdoc, setSrcdoc] = useState(() =>
    data.autorun !== false ? buildSrcdoc(data.code, data.language) : ''
  );
  const [ran, setRan] = useState(data.autorun !== false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-run when code prop changes (agent updates)
  useEffect(() => {
    if (data.autorun !== false) {
      setCode(data.code);
      setSrcdoc(buildSrcdoc(data.code, data.language));
      setRan(true);
    }
  }, [data.code, data.language, data.autorun]);

  const handleRun = useCallback(() => {
    setSrcdoc(buildSrcdoc(code, data.language));
    setRan(true);
  }, [code, data.language]);

  const handleReset = useCallback(() => {
    setCode(data.code);
    setSrcdoc(buildSrcdoc(data.code, data.language));
    setRan(true);
  }, [data.code, data.language]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [code]);

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border bg-background overflow-hidden',
        expanded ? 'fixed inset-4 z-50 shadow-2xl' : 'h-[520px]',
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-mono">
            {LANG_BADGE[data.language]}
          </Badge>
          {data.title && (
            <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
              {data.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-xs"
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 px-2 text-xs"
            title="Reset to original"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded((v) => !v)}
            className="h-7 w-7"
          >
            {expanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            onClick={handleRun}
            className="h-7 px-3 text-xs gap-1"
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
        </div>
      </div>

      {/* Two-pane body */}
      <div className="flex flex-1 min-h-0">
        {/* Editor pane */}
        <div className="w-1/2 border-r flex flex-col min-h-0">
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground border-b bg-muted/20">
            Editor
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language={monacoLanguage(data.language)}
              value={code}
              onChange={(val) => setCode(val ?? '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                automaticLayout: true,
                padding: { top: 8, bottom: 8 },
              }}
            />
          </div>
        </div>

        {/* Preview pane */}
        <div className="w-1/2 flex flex-col min-h-0">
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground border-b bg-muted/20">
            Preview
          </div>
          <div className="flex-1 relative bg-white">
            {!ran ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Click <strong>Run</strong> to see the output.
                </p>
                <Button size="sm" onClick={handleRun} className="gap-1">
                  <Play className="h-3.5 w-3.5" />
                  Run
                </Button>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                title="Code preview"
                sandbox="allow-scripts allow-modals"
                srcDoc={srcdoc}
                className="w-full h-full border-0"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
