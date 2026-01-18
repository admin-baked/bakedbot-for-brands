// src/app/dashboard/menu/publish/components/publish-dialog.tsx
'use client';

/**
 * Publish Dialog (Dispensary)
 * 
 * Confirmation dialog for publishing the dispensary's headless menu.
 */

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Rocket } from 'lucide-react';

interface PublishDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    locationSlug: string;
    onPublish: () => void;
}

export function PublishDialog({ open, onOpenChange, locationSlug, onPublish }: PublishDialogProps) {
    const publicUrl = `https://bakedbot.ai/shop/${locationSlug}`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto bg-primary/10 p-3 rounded-full mb-2 w-fit">
                        <Rocket className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center text-xl">Publish Your Menu</DialogTitle>
                    <DialogDescription className="text-center">
                        Your dispensary menu will be live at:
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="bg-muted rounded-lg p-4 text-center">
                        <p className="text-lg font-mono font-semibold text-primary break-all">
                            {publicUrl}
                        </p>
                    </div>

                    <ul className="mt-6 space-y-3">
                        <li className="flex items-start gap-3 text-sm">
                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>Real-time menu synced with your POS</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm">
                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>Smokey AI Budtender for customer support</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm">
                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>Online ordering and pickup ready</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm">
                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>SEO-optimized for local search</span>
                        </li>
                    </ul>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={onPublish} className="gap-2">
                        <Rocket className="h-4 w-4" />
                        Publish Now
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
