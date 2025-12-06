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

    // Capture screenshot using browser API
    const captureScreen = async () => {
        setIsCapturing(true);
        try {
            // Use html2canvas or similar library in production
            // For now, simulate capture
            await new Promise(resolve => setTimeout(resolve, 500));

            // In production, you'd do:
            // const canvas = await html2canvas(document.body);
            // const dataUrl = canvas.toDataURL('image/png');

            // Simulated screenshot
            setScreenshot('/api/placeholder/800/600');
            setIsOpen(true);

            // Trigger AI analysis
            analyzeScreenshot();
        } catch (err) {
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
                setScreenshot(event.target?.result as string);
                analyzeScreenshot();
            };
            reader.readAsDataURL(file);
        }
    };

    // AI Analysis (simulated)
    const analyzeScreenshot = async () => {
        setIsAnalyzing(true);
        try {
            // Simulate AI analysis
            await new Promise(resolve => setTimeout(resolve, 2000));

            // In production, send to AI endpoint
            setAiSuggestion({
                title: 'Dashboard fails to load data',
                description: 'The analytics dashboard is showing a loading spinner indefinitely. This appears to be a data fetching issue, possibly related to API timeout or authentication.',
                category: 'bug',
                priority: 'high',
                possibleCauses: [
                    'API endpoint returning 500 error',
                    'Authentication token expired',
                    'Network connectivity issue'
                ]
            });

            setTitle('Dashboard fails to load data');
            setDescription('The analytics dashboard is showing a loading spinner indefinitely. This appears to be a data fetching issue, possibly related to API timeout or authentication.');
        } catch (err) {
            // Silent fail - user can still describe manually
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
            // In production, submit to Firestore
            await new Promise(resolve => setTimeout(resolve, 1000));

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
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Failed to submit ticket',
                description: 'Please try again.'
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
