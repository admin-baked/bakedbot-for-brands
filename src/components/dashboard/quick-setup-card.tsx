'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { MenuImportStep } from '@/app/onboarding/components/menu-import-step';
import { useRouter } from 'next/navigation';

interface QuickSetupCardProps {
    className?: string;
    onDismiss?: () => void;
}

export function QuickSetupCard({ className, onDismiss }: QuickSetupCardProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const handleComplete = (data: { importedName: string; slug: string; zip: string }) => {
        setOpen(false);
        router.refresh();
        // Maybe redirect to the new page or products page?
        // For now, refreshing should show updated stats/products.
    };

    return (
        <Card className={`bg-gradient-to-br from-primary/10 to-background border-primary/20 ${className}`}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <Sparkles className="h-5 w-5" />
                            Complete Your Setup
                        </CardTitle>
                        <CardDescription>
                            Import your live menu and start tracking competitors in minutes.
                        </CardDescription>
                    </div>
                    {onDismiss && (
                        <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8 -mt-2 -mr-2">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto">
                            Start Quick Setup <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl sm:p-10">
                         {/* Reusing the Onboarding Step Component */}
                        <MenuImportStep 
                            onComplete={handleComplete}
                            onSkip={() => setOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
