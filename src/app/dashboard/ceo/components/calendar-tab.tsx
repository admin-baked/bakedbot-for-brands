'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Settings2, User } from 'lucide-react';
import { MeetingsCalendarView } from './meetings-calendar-view';
import { ExecutiveAvailabilityForm } from './executive-availability-form';

export default function CalendarTab() {
    const [subTab, setSubTab] = useState('overview');

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
