'use client';

import { useState, useEffect } from 'react';
import { getCalendarMeetings, getUpcomingMeetings, cancelBooking } from '@/server/actions/executive-calendar';
import { MeetingBooking } from '@/types/executive-calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Video, Clock, User, X, ExternalLink, Loader2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PROFILE_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
    martez: { bg: 'bg-green-50', text: 'text-green-800', badge: 'bg-green-100 text-green-800' },
    jack: { bg: 'bg-blue-50', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-800' },
};

function formatMeetingTime(startAt: Date, endAt: Date): string {
    const timeOpts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    return `${new Intl.DateTimeFormat('en-US', timeOpts).format(startAt)} – ${new Intl.DateTimeFormat('en-US', timeOpts).format(endAt)}`;
}

function formatMeetingDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    }).format(date);
}

function groupByDate(meetings: MeetingBooking[]): Record<string, MeetingBooking[]> {
    const groups: Record<string, MeetingBooking[]> = {};
    for (const m of meetings) {
        const key = new Intl.DateTimeFormat('sv-SE').format(m.startAt);
        if (!groups[key]) groups[key] = [];
        groups[key].push(m);
    }
    return groups;
}

export function MeetingsCalendarView() {
    const [upcoming, setUpcoming] = useState<MeetingBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelTarget, setCancelTarget] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const [martez, jack] = await Promise.all([
                    getUpcomingMeetings('martez', 20),
                    getUpcomingMeetings('jack', 20),
                ]);
                const all = [...martez, ...jack].sort(
                    (a, b) => a.startAt.getTime() - b.startAt.getTime(),
                );
                setUpcoming(all);
            } catch {
                setUpcoming([]);
            } finally {
                setLoading(false);
            }
        }
        void load();
    }, []);

    async function handleCancel() {
        if (!cancelTarget) return;
        setCancelling(true);
        try {
            await cancelBooking(cancelTarget);
            setUpcoming(prev => prev.filter(m => m.id !== cancelTarget));
        } catch {
            // silently fail
        } finally {
            setCancelling(false);
            setCancelTarget(null);
        }
    }

    const grouped = groupByDate(upcoming);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['martez', 'jack'].map(slug => {
                    const c = PROFILE_COLORS[slug];
                    const label = slug === 'martez' ? 'Martez (CEO)' : 'Jack (Head of Revenue)';
                    const url = `https://bakedbot.ai/book/${slug}`;
                    return (
                        <Card key={slug} className={`${c.bg} border-0`}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className={`font-semibold ${c.text}`}>{label}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{url}</p>
                                </div>
                                <a href={url} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                                        <ExternalLink className="h-3 w-3" />
                                        Booking Page
                                    </Button>
                                </a>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="text-muted-foreground">Martez</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-blue-400" />
                    <span className="text-muted-foreground">Jack</span>
                </div>
            </div>

            {/* Upcoming meetings */}
            {upcoming.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center text-muted-foreground">
                        <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>No upcoming meetings scheduled.</p>
                        <p className="text-sm mt-1">Share the booking links above to get started.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([dateKey, meetings]) => (
                        <div key={dateKey}>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                                {formatMeetingDate(new Date(dateKey + 'T12:00:00'))}
                            </h3>
                            <div className="space-y-3">
                                {meetings.map(m => {
                                    const c = PROFILE_COLORS[m.profileSlug] ?? PROFILE_COLORS.martez;
                                    const isToday = new Intl.DateTimeFormat('sv-SE').format(new Date()) === dateKey;
                                    const isPast = m.endAt < new Date();

                                    return (
                                        <Card key={m.id} className="border border-gray-100">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        <div className={`w-1 self-stretch rounded-full ${m.profileSlug === 'martez' ? 'bg-green-400' : 'bg-blue-400'}`} />
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-medium text-sm">{m.externalName}</span>
                                                                <Badge variant="secondary" className={`text-xs ${c.badge}`}>
                                                                    {m.profileSlug === 'martez' ? 'Martez' : 'Jack'}
                                                                </Badge>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {m.meetingTypeName}
                                                                </Badge>
                                                                {isToday && !isPast && (
                                                                    <Badge className="text-xs bg-orange-100 text-orange-700 border-0">Today</Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {formatMeetingTime(m.startAt, m.endAt)}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <User className="h-3 w-3" />
                                                                    {m.externalEmail}
                                                                </span>
                                                            </div>
                                                            {m.purpose && (
                                                                <p className="text-xs text-gray-500 mt-1 truncate max-w-sm">
                                                                    {m.purpose}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {!isPast && (
                                                            <a
                                                                href={m.videoRoomUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7">
                                                                    <Video className="h-3 w-3" />
                                                                    Join
                                                                </Button>
                                                            </a>
                                                        )}
                                                        {!isPast && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                                                                onClick={() => setCancelTarget(m.id)}
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                        {isPast && m.meetingNotes && (
                                                            <Badge variant="outline" className="text-xs text-green-600">Notes ✓</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Cancel confirmation */}
            <AlertDialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this meeting?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The meeting will be marked as cancelled. The guest will not be automatically notified — you may want to email them separately.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep Meeting</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            disabled={cancelling}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel Meeting'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
