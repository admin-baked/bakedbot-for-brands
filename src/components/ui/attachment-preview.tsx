'use client';

/**
 * AttachmentPreviewCard Component
 * 
 * Claude-style compact preview cards for pasted/attached content.
 * Shows truncated preview with ability to expand and view full content.
 * Supports CSV, PDF, text files, images, and pasted text.
 */

import React, { useState, useMemo } from 'react';
import { 
    X, FileText, FileSpreadsheet, Image as ImageIcon, 
    File, ChevronDown, ChevronUp, Copy, Check 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export interface AttachmentItem {
    id: string;
    file?: File;
    preview?: string;
    type: 'image' | 'file' | 'pasted';
    content?: string;  // For pasted text content
    name?: string;     // Display name (for pasted content)
}

interface AttachmentPreviewCardProps {
    attachment: AttachmentItem;
    onRemove: (id: string) => void;
}

// Detect file type and return appropriate icon + color
function getFileInfo(attachment: AttachmentItem) {
    if (attachment.type === 'image') {
        return { icon: ImageIcon, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-950' };
    }
    
    const name = attachment.file?.name || attachment.name || '';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    
    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        return { icon: FileSpreadsheet, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950' };
    }
    if (ext === 'pdf') {
        return { icon: FileText, color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-950' };
    }
    if (attachment.type === 'pasted') {
        return { icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950' };
    }
    
    return { icon: File, color: 'text-muted-foreground', bgColor: 'bg-muted' };
}

// Truncate text for preview
function truncateText(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Format file size
function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentPreviewCard({ attachment, onRemove }: AttachmentPreviewCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showDialog, setShowDialog] = useState(false);
    const [copied, setCopied] = useState(false);
    const [textContent, setTextContent] = useState<string>('');

    const { icon: Icon, color, bgColor } = getFileInfo(attachment);
    
    const fileName = attachment.file?.name || attachment.name || 'Pasted content';
    const fileSize = attachment.file?.size || attachment.content?.length || 0;
    
    // Read text content from file if needed
    React.useEffect(() => {
        if (attachment.content) {
            setTextContent(attachment.content);
        } else if (attachment.file && !attachment.type.includes('image')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setTextContent(e.target?.result as string || '');
            };
            reader.readAsText(attachment.file);
        }
    }, [attachment]);

    const previewText = useMemo(() => {
        return truncateText(textContent, 80);
    }, [textContent]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(textContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <div 
                className={cn(
                    "group relative flex flex-col rounded-lg border transition-all cursor-pointer",
                    "hover:border-primary/50 hover:shadow-sm",
                    "min-w-[200px] max-w-[280px]",
                    bgColor
                )}
                onClick={() => setShowDialog(true)}
            >
                {/* Remove button */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(attachment.id);
                    }}
                    className={cn(
                        "absolute -top-2 -right-2 z-10",
                        "bg-background border rounded-full p-0.5",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        "hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                    )}
                >
                    <X className="w-3.5 h-3.5" />
                </button>

                {/* Image preview */}
                {attachment.type === 'image' && attachment.preview && (
                    <div className="w-full h-16 overflow-hidden rounded-t-lg">
                        <img 
                            src={attachment.preview} 
                            alt="preview" 
                            className="w-full h-full object-cover" 
                        />
                    </div>
                )}

                {/* Content preview */}
                <div className="p-3 space-y-1.5">
                    {/* Header row */}
                    <div className="flex items-center gap-2">
                        <Icon className={cn("w-4 h-4 shrink-0", color)} />
                        <span className="text-xs font-medium truncate flex-1">
                            {fileName}
                        </span>
                    </div>

                    {/* Text preview (for non-image files) */}
                    {attachment.type !== 'image' && previewText && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {previewText}
                        </p>
                    )}

                    {/* Footer - badge and size */}
                    <div className="flex items-center justify-between">
                        <span className={cn(
                            "text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded",
                            "bg-background/80 text-muted-foreground"
                        )}>
                            {attachment.type === 'pasted' ? 'PASTED' : attachment.file?.name.split('.').pop()?.toUpperCase() || 'FILE'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                            {formatSize(fileSize)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Full content dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Icon className={cn("w-5 h-5", color)} />
                            {fileName}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-auto">
                        {attachment.type === 'image' && attachment.preview ? (
                            <img 
                                src={attachment.preview} 
                                alt={fileName} 
                                className="max-w-full rounded-lg" 
                            />
                        ) : (
                            <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg overflow-auto max-h-[50vh]">
                                {textContent}
                            </pre>
                        )}
                    </div>

                    {attachment.type !== 'image' && (
                        <div className="flex justify-end pt-2 border-t">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleCopy}
                                className="gap-2"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied!' : 'Copy Content'}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

/**
 * AttachmentPreviewList - Container for multiple attachment cards
 */
interface AttachmentPreviewListProps {
    attachments: AttachmentItem[];
    onRemove: (id: string) => void;
}

export function AttachmentPreviewList({ attachments, onRemove }: AttachmentPreviewListProps) {
    if (attachments.length === 0) return null;

    return (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {attachments.map(attachment => (
                <AttachmentPreviewCard 
                    key={attachment.id} 
                    attachment={attachment} 
                    onRemove={onRemove} 
                />
            ))}
        </div>
    );
}
