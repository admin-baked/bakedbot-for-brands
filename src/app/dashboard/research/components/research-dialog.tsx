'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Globe, Loader2 } from 'lucide-react';
import { createResearchTaskAction } from '../actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ResearchDialogProps {
    userId: string;
    brandId: string;
    children: React.ReactNode;
}

export function ResearchDialog({ userId, brandId, children }: ResearchDialogProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async () => {
        if (!query.trim()) {
            toast.error('Please enter a research query');
            return;
        }

        setLoading(true);
        try {
            const result = await createResearchTaskAction(query.trim());

            if (result.success) {
                toast.success('Research task created! Smokey is on it.');
                setQuery('');
                setOpen(false);
                router.refresh();
            } else {
                toast.error(result.error || 'Failed to create research task');
            }
        } catch (err) {
            toast.error('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-emerald-600" />
                        New Deep Research Task
                    </DialogTitle>
                    <DialogDescription>
                        Describe what you want Smokey to research. Be specific for better results.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="query">Research Query</Label>
                        <Textarea
                            id="query"
                            placeholder="e.g., Analyze competitor pricing strategies for flower products in Syracuse, NY"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="min-h-[120px] resize-none"
                            disabled={loading}
                        />
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Smokey will search the web, analyze data, and compile a comprehensive report.
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !query.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Globe className="h-4 w-4 mr-2" />
                                Start Research
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
