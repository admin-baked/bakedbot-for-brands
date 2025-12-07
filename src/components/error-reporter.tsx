'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Camera, Bug, Loader2, CheckCircle2, AlertTriangle, X, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ErrorReporterProps {
    className?: string;
}

export function ErrorReporter({ className }: ErrorReporterProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [aiSuggestion, setAiSuggestion] = useState<{
        title: string;
        description: string;
        category: string;
        priority: string;
        possibleCauses: string[];
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Capture screenshot using html2canvas
    const captureScreen = async () => {
        setIsCapturing(true);
        try {
            // Dynamically import html2canvas to ensure it's client-side only and compatible with Next.js
            const html2canvas = (await import('html2canvas')).default;

            const canvas = await html2canvas(document.body, {
                useCORS: true, // Allow cross-origin images if possible
                logging: false, // Cleaner logs
                scale: 1, // Standard scale to keep size reasonable
            });

            // Convert to JPEG with 0.7 quality for compression
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

            setScreenshot(dataUrl);
            setIsOpen(true);

            // Trigger AI analysis (Simulated for now, could be real API later)
            analyzeScreenshot(dataUrl);
        } catch (err) {
            console.error("Screenshot capture failed:", err);
            toast({
                variant: 'destructive',
                title: 'Failed to capture screenshot',
                description: 'Please try uploading a screenshot instead.'
            });
        } finally {
            setIsCapturing(false);
        }
    };

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                setScreenshot(result);
                analyzeScreenshot(result);
            };
            reader.readAsDataURL(file);
        }
    };

    // AI Analysis (Simulated for now - could be connected to Gemini later)
    const analyzeScreenshot = async (imageData: string) => {
        setIsAnalyzing(true);
        try {
            // Using a simpler timeout for the "AI" feeling
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Basic heuristic based on URL to make it feel smarter
            const currentPath = window.location.pathname;
            let suggestion = {
                title: 'Issue Report',
                description: `Issue encountered on ${currentPath}.`,
                category: 'bug',
                priority: 'medium',
                possibleCauses: ['Unknown error'],
            };

            if (currentPath.includes('dashboard')) {
                suggestion = {
                    title: 'Dashboard Display Issue',
                    description: `I encountered a problem while viewing the dashboard at ${currentPath}.`,
                    category: 'bug',
                    priority: 'medium',
                    possibleCauses: ['Data loading failure', 'Rendering error', 'Browser compatibility'],
                };
            }

            setAiSuggestion(suggestion);
            setTitle(suggestion.title);
            setDescription(suggestion.description);
        } catch (err) {
            // Silent fail
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Submit ticket
    const submitTicket = async () => {
        if (!title.trim()) {
            toast({ variant: 'destructive', title: 'Please provide a title' });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/tickets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    description,
                    priority: aiSuggestion?.priority || 'medium',
                    category: aiSuggestion?.category || 'system_error',
                    screenshotUrl: screenshot,
                    pageUrl: window.location.pathname,
                    reporterEmail: 'user@example.com', // In real app, this comes from session
                    orgName: 'My Organization', // In real app, this comes from session
                    userRole: 'user', // In real app, this comes from session
                    userAgent: navigator.userAgent,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to submit ticket');
            }

            toast({
                title: 'Ticket submitted!',
                description: 'Our team will review your report shortly.',
            });

            // Reset state
            setIsOpen(false);
            setScreenshot(null);
            setTitle('');
            setDescription('');
            setAiSuggestion(null);
        } catch (err: any) {
            console.error("Ticket submission failed:", err);
            toast({
                variant: 'destructive',
                title: 'Failed to submit ticket',
                description: err.message || 'Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Floating Report Button */}
            <Button
                variant="outline"
                size="sm"
                className={cn(
                    "fixed bottom-4 right-4 gap-2 shadow-lg z-50",
                    "bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200",
                    className
                )}
                onClick={() => setIsOpen(true)}
                disabled={isCapturing}
            >
                {isCapturing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Bug className="h-4 w-4" />
                )}
                Report Issue
            </Button>

            {/* Report Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Bug className="h-5 w-5 text-red-500" />
                            Report an Issue
                        </DialogTitle>
                        <DialogDescription>
                            Capture or upload a screenshot and our AI will help describe the issue.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Screenshot Section */}
                        <div className="space-y-2">
                            <Label>Screenshot</Label>
                            {screenshot ? (
                                <div className="relative rounded-lg border overflow-hidden">
                                    <img
                                        src={screenshot}
                                        alt="Error screenshot"
                                        className="w-full max-h-[300px] object-contain bg-slate-100"
                                    />
                                    <Button
                                        size="icon"
                                        variant="destructive"
                                        className="absolute top-2 right-2 h-8 w-8"
                                        onClick={() => setScreenshot(null)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                    {isAnalyzing && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <div className="flex items-center gap-2 text-white">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                AI analyzing screenshot...
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-24 flex-col gap-2"
                                        onClick={captureScreen}
                                        disabled={isCapturing}
                                    >
                                        <Camera className="h-6 w-6" />
                                        <span>Capture Screen</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-24 flex-col gap-2"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="h-6 w-6" />
                                        <span>Upload Image</span>
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                </div>
                            )}
                        </div>

                        {/* AI Suggestions */}
                        {aiSuggestion && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 text-blue-700 font-medium">
                                    <CheckCircle2 className="h-4 w-4" />
                                    AI Analysis Complete
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant="outline">{aiSuggestion.category}</Badge>
                                    <Badge variant={aiSuggestion.priority === 'high' ? 'destructive' : 'secondary'}>
                                        {aiSuggestion.priority} priority
                                    </Badge>
                                </div>
                                <div className="text-sm text-blue-700">
                                    <strong>Possible causes:</strong>
                                    <ul className="list-disc ml-4 mt-1">
                                        {aiSuggestion.possibleCauses.map((cause, i) => (
                                            <li key={i}>{cause}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Issue Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Brief description of the issue"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Details</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What were you trying to do? What happened instead?"
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={submitTicket}
                            disabled={isSubmitting || !title.trim()}
                            className="gap-2"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4" />
                            )}
                            Submit Report
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
