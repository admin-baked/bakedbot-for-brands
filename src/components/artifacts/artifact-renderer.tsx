'use client';

/**
 * ArtifactRenderer Component
 * 
 * Renders different artifact types with appropriate formatting:
 * - Code: Syntax highlighting
 * - Markdown: Rich text rendering
 * - Diagram: Mermaid diagrams
 * - Chart: Data visualizations
 * - Deck: Slide presentations
 * - Table: Data tables
 * - Research: Structured reports
 */

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import { 
    Artifact, 
    ArtifactType, 
    isCodeArtifact, 
    isDeckArtifact, 
    isDiagramArtifact, 
    isChartArtifact 
} from '@/types/artifact';
import { 
    ExternalLink, BookOpen, FileText, Lightbulb, 
    ListOrdered, ChevronRight 
} from 'lucide-react';

interface ArtifactRendererProps {
    artifact: Artifact;
    currentSlide?: number;
    theme?: 'light' | 'dark';
}

export function ArtifactRenderer({ artifact, currentSlide = 0, theme = 'dark' }: ArtifactRendererProps) {
    const renderContent = useMemo(() => {
        switch (artifact.type) {
            case 'code':
                return <CodeRenderer artifact={artifact} theme={theme} />;
            case 'markdown':
                return <MarkdownRenderer content={artifact.content} />;
            case 'research':
                return <ResearchRenderer artifact={artifact} />;
            case 'deck':
                return <DeckRenderer artifact={artifact} currentSlide={currentSlide} />;
            case 'diagram':
                return <DiagramRenderer artifact={artifact} />;
            case 'chart':
                return <ChartRenderer artifact={artifact} />;
            case 'table':
                return <TableRenderer artifact={artifact} />;
            case 'infographic':
                return <InfographicRenderer artifact={artifact} />;
            case 'image':
                return <ImageRenderer artifact={artifact} />;
            default:
                return <MarkdownRenderer content={artifact.content} />;
        }
    }, [artifact, currentSlide, theme]);

    return (
        <div className="artifact-renderer">
            {renderContent}
        </div>
    );
}

// ============ Code Renderer ============

function CodeRenderer({ artifact, theme }: { artifact: Artifact; theme: 'light' | 'dark' }) {
    return (
        <div className="rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                    {artifact.language || 'code'}
                </span>
            </div>
            <SyntaxHighlighter
                language={artifact.language || 'typescript'}
                style={theme === 'dark' ? oneDark : oneLight}
                customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    fontSize: '14px',
                }}
                showLineNumbers
            >
                {artifact.content}
            </SyntaxHighlighter>
        </div>
    );
}

// ============ Markdown Renderer ============

function MarkdownRenderer({ content }: { content: string }) {
    return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        </div>
    );
}

// ============ Research Renderer ============

function ResearchRenderer({ artifact }: { artifact: Artifact }) {
    const sections = useMemo(() => {
        // Parse research content into sections
        const content = artifact.content;
        const parts = content.split(/^(?=##\s)/m);
        return parts.map(part => {
            const lines = part.trim().split('\n');
            const title = lines[0]?.replace(/^#+\s*/, '') || '';
            const body = lines.slice(1).join('\n');
            return { title, body };
        }).filter(s => s.title);
    }, [artifact.content]);

    return (
        <div className="space-y-6">
            {/* Summary */}
            {artifact.metadata?.summary && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                        <Lightbulb className="h-4 w-4" />
                        <span className="font-medium">Summary</span>
                    </div>
                    <p className="text-sm text-blue-900 dark:text-blue-200">
                        {artifact.metadata.summary}
                    </p>
                </div>
            )}

            {/* Content sections */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {artifact.content}
                </ReactMarkdown>
            </div>

            {/* Sources */}
            {artifact.metadata?.sources && artifact.metadata.sources.length > 0 && (
                <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Sources</span>
                    </div>
                    <ul className="space-y-2">
                        {artifact.metadata.sources.map((source, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="text-xs text-muted-foreground mt-1">[{i + 1}]</span>
                                <a 
                                    href={source.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline flex items-center gap-1"
                                >
                                    {source.title}
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ============ Deck Renderer ============

function DeckRenderer({ artifact, currentSlide }: { artifact: Artifact; currentSlide: number }) {
    const slides = artifact.metadata?.slides || [];
    const slide = slides[currentSlide];

    if (!slide) {
        return <MarkdownRenderer content={artifact.content} />;
    }

    return (
        <div className="space-y-4">
            {/* Slide content */}
            <div className="bg-gradient-to-br from-background to-muted/50 border rounded-xl p-8 min-h-[300px]">
                <h2 className="text-2xl font-bold mb-6">{slide.title}</h2>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {slide.content}
                    </ReactMarkdown>
                </div>
            </div>

            {/* Slide thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {slides.map((s, i) => (
                    <div 
                        key={i}
                        className={cn(
                            "shrink-0 w-20 h-14 rounded border p-1.5 text-[6px] leading-tight overflow-hidden cursor-pointer transition-all",
                            i === currentSlide 
                                ? "border-primary bg-primary/10" 
                                : "border-muted hover:border-primary/50"
                        )}
                    >
                        <p className="font-semibold truncate">{s.title}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============ Diagram Renderer ============

function DiagramRenderer({ artifact }: { artifact: Artifact }) {
    // For Mermaid diagrams, we'll render a placeholder that can be enhanced
    // with client-side Mermaid.js rendering
    return (
        <div className="space-y-4">
            <div className="bg-muted/30 border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                    {artifact.metadata?.diagramType || 'Diagram'}
                </p>
                <pre className="text-sm font-mono whitespace-pre-wrap bg-background p-4 rounded border">
                    {artifact.content}
                </pre>
            </div>
            <p className="text-xs text-muted-foreground text-center">
                Diagram preview will render in full view
            </p>
        </div>
    );
}

// ============ Chart Renderer ============

function ChartRenderer({ artifact }: { artifact: Artifact }) {
    const chartData = artifact.metadata?.chartData;
    const chartType = artifact.metadata?.chartType || 'bar';

    return (
        <div className="space-y-4">
            <div className="bg-muted/30 border rounded-lg p-6 min-h-[200px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                    <p className="text-sm font-medium mb-2">
                        {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart
                    </p>
                    {chartData ? (
                        <pre className="text-xs text-left bg-background p-2 rounded">
                            {JSON.stringify(chartData, null, 2).substring(0, 200)}...
                        </pre>
                    ) : (
                        <p className="text-xs">Chart data will render here</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============ Table Renderer ============

function TableRenderer({ artifact }: { artifact: Artifact }) {
    const headers = artifact.metadata?.headers || [];
    const rows = artifact.metadata?.rows || [];

    if (headers.length === 0 && rows.length === 0) {
        // Try to parse from content (CSV-like)
        const lines = artifact.content.trim().split('\n');
        if (lines.length > 0) {
            const parsedHeaders = lines[0].split(',').map(h => h.trim());
            const parsedRows = lines.slice(1).map(line => line.split(',').map(c => c.trim()));
            return <TableView headers={parsedHeaders} rows={parsedRows} />;
        }
    }

    return <TableView headers={headers} rows={rows} />;
}

function TableView({ headers, rows }: { headers: string[]; rows: string[][] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="bg-muted">
                        {headers.map((h, i) => (
                            <th key={i} className="text-left p-2 border font-medium">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/30'}>
                            {row.map((cell, j) => (
                                <td key={j} className="p-2 border">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ============ Infographic Renderer ============

function InfographicRenderer({ artifact }: { artifact: Artifact }) {
    return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-xl p-6 min-h-[300px]">
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {artifact.content}
                </ReactMarkdown>
            </div>
        </div>
    );
}

// ============ Image Renderer ============

function ImageRenderer({ artifact }: { artifact: Artifact }) {
    // Content could be a base64 image or URL
    const isBase64 = artifact.content.startsWith('data:image');
    const isUrl = artifact.content.startsWith('http');
    
    const src = isBase64 || isUrl ? artifact.content : `data:image/png;base64,${artifact.content}`;

    return (
        <div className="flex items-center justify-center p-4">
            <img 
                src={src} 
                alt={artifact.title} 
                className="max-w-full rounded-lg shadow-lg"
            />
        </div>
    );
}

export { CodeRenderer, MarkdownRenderer, ResearchRenderer, DeckRenderer, DiagramRenderer };
