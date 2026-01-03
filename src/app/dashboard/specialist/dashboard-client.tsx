'use client';

import { useEffect, useState } from 'react';
import { PuffChat } from '@/app/dashboard/ceo/components/puff-chat';
import { SetupChecklist } from './components/setup-checklist';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'; // Assuming we have Sheet
import { CheckSquare, Sparkles } from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';
import { setCookie, getCookie } from 'cookies-next';

export default function SpecialistDashboardClient() {
    const { user } = useUser();
    const [showWelcome, setShowWelcome] = useState(false);
    const [isChecklistOpen, setIsChecklistOpen] = useState(false);

    useEffect(() => {
        // Show welcome modal only once
        const hasSeenWelcome = getCookie('has_seen_specialist_welcome');
        if (!hasSeenWelcome) {
            setShowWelcome(true);
            setCookie('has_seen_specialist_welcome', 'true', { maxAge: 60 * 60 * 24 * 365 }); // 1 year
        }

        // Auto-open checklist if new user (dummy logic for now, could check completion status)
        if (!hasSeenWelcome) {
            setIsChecklistOpen(true);
        }
    }, []);

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full relative">
                <div className="absolute top-4 right-4 z-10">
                    <Sheet open={isChecklistOpen} onOpenChange={setIsChecklistOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 bg-background/80 backdrop-blur">
                                <CheckSquare className="h-4 w-4" />
                                Setup Actions
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetTitle>Setup Actions</SheetTitle>
                            <div className="mt-6">
                                <SetupChecklist />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
                
                {/* Pass layout props to PuffChat */}
                <PuffChat 
                    initialTitle="Digital Team" 
                    hideHeader={false} 
                    className="h-full"
                    isAuthenticated={true}
                    isHired={true}
                />
            </div>

            {/* Welcome Modal */}
            <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
                <DialogContent>
                    <DialogHeader>
                        <div className="mx-auto bg-primary/10 p-3 rounded-full mb-4 w-fit">
                            <Sparkles className="h-8 w-8 text-primary" />
                        </div>
                        <DialogTitle className="text-center text-2xl">Welcome to Your Digital Team</DialogTitle>
                        <DialogDescription className="text-center pt-2">
                           Your agents are ready to work. 
                           Complete the setup checklist to unlock their full potential, or start chatting now.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center">
                        <Button onClick={() => setShowWelcome(false)} className="w-full sm:w-auto">
                            Let's Go
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
