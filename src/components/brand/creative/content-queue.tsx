'use client';

import { motion } from 'framer-motion';
import { Send, Edit2, CheckCircle2, XCircle, Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CreativeQRCode } from '@/components/brand/creative/creative-qr-code';
import type { CreativeContent } from '@/types/creative-content';

// Mock types for content items
export interface ContentItem {
  id: string;
  type: 'instagram' | 'tiktok' | 'linkedin';
  thumbnailUrl: string;
  caption: string;
  status: 'pending' | 'approved' | 'revision';
  scheduledDate?: string;
  // QR code data (for approved content)
  qrDataUrl?: string;
  qrSvg?: string;
  contentUrl?: string;
  qrStats?: {
    scans: number;
    lastScanned?: Date;
    scansByPlatform?: Record<string, number>;
    scansByLocation?: Record<string, number>;
  };
  // Full content object for QR component (if available)
  fullContent?: CreativeContent;
}

interface ContentQueueProps {
  items: ContentItem[];
  onApprove: (id: string) => void;
  onRevise: (id: string, note: string) => void;
  onEditCaption?: (id: string, newCaption: string) => void;
}

export function ContentQueue({ items, onApprove, onRevise, onEditCaption }: ContentQueueProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [revisionNote, setRevisionNote] = useState('');
  const [isRevising, setIsRevising] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');

  // Simple mock handling for demo
  const currentItem = items[activeIndex];

  const handleNext = () => {
    if (activeIndex < items.length - 1) setActiveIndex(prev => prev + 1);
  };

  const handleApprove = () => {
    if (currentItem) {
        onApprove(currentItem.id);
        handleNext();
    }
  };

  const handleSubmitRevision = () => {
    if (currentItem && revisionNote) {
        onRevise(currentItem.id, revisionNote);
        setRevisionNote('');
        setIsRevising(false);
        handleNext();
    }
  };

  const handleStartEdit = () => {
    if (currentItem) {
        setEditedCaption(currentItem.caption);
        setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (currentItem && editedCaption && onEditCaption) {
        onEditCaption(currentItem.id, editedCaption);
        setIsEditing(false);
        setEditedCaption('');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedCaption('');
  };;

  if (!items.length) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border-2 border-dashed rounded-xl h-[300px]">
            <CheckCircle2 className="w-12 h-12 mb-4 opacity-50" />
            <p>All caught up! No pending content.</p>
        </div>
    );
  }

  // Mobile-first "Card Stack" or simple carousel view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Approval Queue ({items.length})
        </h3>
        <span className="text-xs text-muted-foreground">
            {activeIndex + 1} / {items.length}
        </span>
      </div>

      <div className="relative bg-card border rounded-xl overflow-hidden shadow-sm min-h-[400px] flex flex-col md:flex-row">
            {/* Visual Preview Area (Left/Top) */}
            <div className="flex-1 bg-muted/30 p-6 flex items-center justify-center">
                 {/* Placeholder for actual preview embedding - using thumbnail for now */}
                 <div className="relative aspect-[9/16] md:aspect-square w-full max-w-[300px] bg-black/5 rounded-lg overflow-hidden border shadow-inner">
                    <img 
                        src={currentItem.thumbnailUrl || '/placeholder-image.jpg'} 
                        alt="Content Preview" 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-white text-xs font-medium uppercase">
                        {currentItem.type}
                    </div>
                 </div>
            </div>

            {/* Action Area (Right/Bottom) */}
            <div className="flex-1 p-6 flex flex-col">
                <div className="flex-1 space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-lg">Generated Caption</h4>
                            {!isEditing && !isRevising && onEditCaption && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleStartEdit}
                                    className="gap-1 h-7 text-xs"
                                >
                                    <Pencil className="w-3 h-3" />
                                    Edit
                                </Button>
                            )}
                        </div>
                        {isEditing ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-2"
                            >
                                <Textarea
                                    value={editedCaption}
                                    onChange={(e) => setEditedCaption(e.target.value)}
                                    className="text-sm min-h-[100px]"
                                    placeholder="Edit your caption..."
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="gap-1">
                                        <X className="w-3 h-3" />
                                        Cancel
                                    </Button>
                                    <Button size="sm" onClick={handleSaveEdit} className="gap-1">
                                        <Save className="w-3 h-3" />
                                        Save
                                    </Button>
                                </div>
                            </motion.div>
                        ) : (
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {currentItem.caption}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        <span className="font-medium text-primary">Scheduled for:</span>
                        {currentItem.scheduledDate || 'Next available slot'}
                    </div>

                    {/* QR Code Section (shown for approved/scheduled content or if QR data exists) */}
                    {currentItem.status === 'approved' && currentItem.fullContent && (
                        <div className="mt-4">
                            <CreativeQRCode
                                content={currentItem.fullContent}
                                size={200}
                                showStats={true}
                                showDownload={true}
                            />
                        </div>
                    )}

                    {/* Fallback QR notice for pending content */}
                    {currentItem.status === 'pending' && (
                        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-xs text-green-700 dark:text-green-300 text-center">
                                🎯 A trackable QR code will be generated automatically upon approval
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-6 space-y-3">
                    {isRevising ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3 bg-muted/30 p-3 rounded-lg border"
                        >
                            <label className="text-xs font-semibold">Magic Edit Request</label>
                            <Textarea 
                                placeholder="E.g., 'Make it more aggressive', 'Mention the Friday sale'..."
                                value={revisionNote}
                                onChange={(e) => setRevisionNote(e.target.value)}
                                className="text-sm min-h-[80px]"
                            />
                            <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setIsRevising(false)}>Cancel</Button>
                                <Button size="sm" onClick={handleSubmitRevision} className="gap-2">
                                    <Send className="w-3.5 h-3.5" /> Send to Craig
                                </Button>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <Button 
                                variant="outline" 
                                className="h-12 border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setIsRevising(true)}
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Request Edit
                            </Button>
                            <Button 
                                className="h-12 bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-900/10"
                                onClick={handleApprove}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Approve & Schedule
                            </Button>
                        </div>
                    )}
                </div>
            </div>
      </div>
    </div>
  );
}
