'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Loader2, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { seedSeoPageAction } from '../actions';
import type { ActionResult } from '../actions';

interface QuickGeneratorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function QuickGeneratorDialog({
    open,
    onOpenChange,
    onSuccess
}: QuickGeneratorDialogProps) {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [zipInput, setZipInput] = useState('');
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);

    const parseZipCodes = (input: string): string[] => {
        return input
            .split(/[\n,]+/) // Split by newlines or commas
            .map(s => s.trim())
            .filter(s => /^\d{5}$/.test(s)); // Only 5-digit ZIPs
    };

    const handleGenerate = async () => {
        const zips = parseZipCodes(zipInput);

        if (zips.length === 0) {
            toast({
                title: 'No Valid ZIPs',
                description: 'Please enter valid 5-digit ZIP codes.',
                variant: 'destructive',
            });
            return;
        }

        setIsGenerating(true);
        setProgress(0);
        setLogs([]);
        
        const results: { zip: string; success: boolean; message: string }[] = [];

        // Process sequentially to be safe, or concurrent clumps if robust
        for (let i = 0; i < zips.length; i++) {
            const zip = zips[i];
            setLogs(prev => [`Generating ${zip}...`, ...prev]);
            
            try {
                const result = await seedSeoPageAction({ zipCode: zip });
                if (result.error) {
                    setLogs(prev => [`❌ ${zip}: ${result.message}`, ...prev]);
                    results.push({ zip, success: false, message: result.message });
                } else {
                    setLogs(prev => [`✅ ${zip}: Success`, ...prev]);
                    results.push({ zip, success: true, message: result.message });
                }
            } catch (error: any) {
                setLogs(prev => [`❌ ${zip}: Unexpected Error`, ...prev]);
                results.push({ zip, success: false, message: error.message });
            }

            setProgress(Math.round(((i + 1) / zips.length) * 100));
        }

        const successCount = results.filter(r => r.success).length;
        toast({
            title: 'Batch Complete',
            description: `Generated ${successCount} of ${zips.length} pages.`,
            variant: successCount === zips.length ? 'default' : 'destructive',
        });

        setIsGenerating(false);
        if (successCount > 0) {
            onSuccess?.();
            // Don't close automatically so they can see logs
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !isGenerating && onOpenChange(val)}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        Quick Batch Generator
                    </DialogTitle>
                    <DialogDescription>
                        Paste a list of ZIP codes (one per line or comma-separated) to quickly generate SEO pages.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {!isGenerating ? (
                        <div className="space-y-2">
                            <Label htmlFor="zips">ZIP Codes</Label>
                            <Textarea
                                id="zips"
                                placeholder="90210&#10;90001&#10;10001"
                                className="font-mono"
                                rows={10}
                                value={zipInput}
                                onChange={(e) => setZipInput(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Found {parseZipCodes(zipInput).length} valid ZIP codes.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Progress</span>
                                    <span>{progress}%</span>
                                </div>
                                <Progress value={progress} />
                            </div>
                            
                            <div className="bg-slate-950 text-slate-50 font-mono text-xs p-4 rounded-md h-64 overflow-y-auto space-y-1">
                                {logs.map((log, i) => (
                                    <div key={i} className={log.startsWith('❌') ? 'text-red-400' : 'text-green-400'}>
                                        {log}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {!isGenerating ? (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button onClick={handleGenerate} disabled={parseZipCodes(zipInput).length === 0}>
                                Generate Pages
                            </Button>
                        </>
                    ) : (
                        <Button disabled>Processing...</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
