'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MeetingsCalendarView } from './meetings-calendar-view';
import { ExecutiveAvailabilityForm } from './executive-availability-form';

export default function CalendarTab() {
    const [subTab, setSubTab] = useState('overview');
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // Show feedback from Google Calendar OAuth redirect
    useEffect(() => {
        const calendarSync = searchParams.get('calendarSync');
        if (!calendarSync) return;
        if (calendarSync === 'success') {
            toast({ title: 'Google Calendar connected', description: 'Bookings will now sync 2-way with Google Calendar.' });
            setSubTab('martez'); // Jump to settings so user sees the Connected badge
        } else if (calendarSync === 'error') {
            toast({ title: 'Connection failed', description: 'Could not connect Google Calendar. Please try again.', variant: 'destructive' });
        } else if (calendarSync === 'invalid') {
            toast({ title: 'Invalid request', description: 'OAuth flow failed — missing profile or code.', variant: 'destructive' });
        }
        // Remove the param from URL without reloading
        const url = new URL(window.location.href);
        url.searchParams.delete('calendarSync');
        window.history.replaceState({}, '', url.toString());
    }, [searchParams, toast]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Executive Calendar</h2>
                <p className="text-muted-foreground mt-1">
                    Manage meetings for Martez and Jack. Powered by Leo + Felisha.
                </p>
            </div>

            <Tabs value={subTab} onValueChange={setSubTab}>
                <TabsList className="mb-4">
                    <TabsTrigger value="overview" className="gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="martez" className="gap-2">
                        <User className="h-4 w-4" />
                        Martez Settings
                    </TabsTrigger>
                    <TabsTrigger value="jack" className="gap-2">
                        <User className="h-4 w-4" />
                        Jack Settings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <MeetingsCalendarView />
                </TabsContent>

                <TabsContent value="martez">
                    <ExecutiveAvailabilityForm profileSlug="martez" />
                </TabsContent>

                <TabsContent value="jack">
                    <ExecutiveAvailabilityForm profileSlug="jack" />
                </TabsContent>
            </Tabs>
        </div>
    );
}
