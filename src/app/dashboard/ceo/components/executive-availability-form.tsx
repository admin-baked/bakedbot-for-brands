'use client';

import { useState, useEffect } from 'react';
import { getExecutiveProfile, updateAvailabilitySettings } from '@/server/actions/executive-calendar';
import { ExecutiveProfile, AvailabilityWindow } from '@/types/executive-calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, ExternalLink, Video, CalendarCheck2, Link } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
    profileSlug: string;
}

export function ExecutiveAvailabilityForm({ profileSlug }: Props) {
    const [profile, setProfile] = useState<ExecutiveProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
    const [bufferMinutes, setBufferMinutes] = useState(15);
    const [timezone, setTimezone] = useState('America/New_York');

    useEffect(() => {
        async function load() {
            setLoading(true);
            const p = await getExecutiveProfile(profileSlug);
            setProfile(p);
            if (p) {
                setWindows(p.availability.windows);
                setBufferMinutes(p.availability.bufferMinutes);
                setTimezone(p.availability.timezone);
            }
            setLoading(false);
        }
        void load();
    }, [profileSlug]);

    function toggleDay(dow: number) {
        const existing = windows.find(w => w.dayOfWeek === dow);
        if (existing) {
            setWindows(prev => prev.filter(w => w.dayOfWeek !== dow));
        } else {
            setWindows(prev => [...prev, { dayOfWeek: dow, startTime: '09:00', endTime: '17:00' }]);
        }
    }

    function updateWindowTime(dow: number, field: 'startTime' | 'endTime', value: string) {
        setWindows(prev =>
            prev.map(w => (w.dayOfWeek === dow ? { ...w, [field]: value } : w)),
        );
    }

    async function handleSave() {
        setSaving(true);
        setSaved(false);
        try {
            await updateAvailabilitySettings(profileSlug, {
                timezone,
                bufferMinutes,
                windows: windows.sort((a, b) => a.dayOfWeek - b.dayOfWeek),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch {
            // error silently
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!profile) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                    Profile not found. Run the seed script to initialize.
                </CardContent>
            </Card>
        );
    }

    const displayName = profile.displayName;
    const bookingUrl = `https://bakedbot.ai/book/${profileSlug}`;

    return (
        <div className="space-y-6">
            {/* Profile header */}
            <Card>
                <CardContent className="p-5 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-lg">{displayName}</h3>
                        <p className="text-sm text-muted-foreground">{profile.title}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <ExternalLink className="h-3.5 w-3.5" />
                                View Booking Page
                            </Button>
                        </a>
                        <Badge variant="secondary" className="text-xs">
                            {bookingUrl.replace('https://', '')}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Daily.co info */}
            <Card className="border-blue-100 bg-blue-50">
                <CardContent className="p-4 flex items-center gap-3">
                    <Video className="h-5 w-5 text-blue-600 shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-blue-900">Video meetings via LiveKit</p>
                        <p className="text-xs text-blue-700 mt-0.5">
                            Rooms are auto-created on booking. Felisha attends silently and generates post-meeting notes.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Google Calendar sync */}
            {profile.googleCalendarTokens?.refresh_token ? (
                <Card className="border-green-100 bg-green-50">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CalendarCheck2 className="h-5 w-5 text-green-600 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-green-900">Google Calendar connected</p>
                                <p className="text-xs text-green-700 mt-0.5">
                                    Bookings sync to {displayName}&apos;s calendar. Busy times block new slots.
                                </p>
                            </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                            Active
                        </Badge>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-dashed">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div>
                                <p className="text-sm font-medium">Connect Google Calendar</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    2-way sync: blocks busy times, creates events on booking.
                                </p>
                            </div>
                        </div>
                        <a href={`/api/calendar/google/connect?profileSlug=${profileSlug}`}>
                            <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                                <ExternalLink className="h-3.5 w-3.5" />
                                Connect
                            </Button>
                        </a>
                    </CardContent>
                </Card>
            )}

            {/* Availability settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Availability Windows</CardTitle>
                    <CardDescription>Days and hours when {displayName} is available for meetings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Day toggles */}
                    <div>
                        <Label className="text-sm mb-3 block">Available days</Label>
                        <div className="flex gap-2 flex-wrap">
                            {DAYS.map((day, i) => {
                                const isOn = windows.some(w => w.dayOfWeek === i);
                                return (
                                    <button
                                        key={i}
                                        onClick={() => toggleDay(i)}
                                        className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${isOn
                                            ? 'bg-black text-white'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Time ranges per day */}
                    {windows.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map(w => (
                        <div key={w.dayOfWeek} className="flex items-center gap-3">
                            <span className="w-10 text-sm font-medium text-gray-700">{DAYS[w.dayOfWeek]}</span>
                            <Input
                                type="time"
                                value={w.startTime}
                                onChange={e => updateWindowTime(w.dayOfWeek, 'startTime', e.target.value)}
                                className="w-36 h-9 text-sm"
                            />
                            <span className="text-gray-400 text-sm">to</span>
                            <Input
                                type="time"
                                value={w.endTime}
                                onChange={e => updateWindowTime(w.dayOfWeek, 'endTime', e.target.value)}
                                className="w-36 h-9 text-sm"
                            />
                        </div>
                    ))}

                    {/* Buffer + timezone */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1.5">
                            <Label className="text-sm">Buffer between meetings (min)</Label>
                            <Input
                                type="number"
                                min={0}
                                max={60}
                                value={bufferMinutes}
                                onChange={e => setBufferMinutes(parseInt(e.target.value) || 0)}
                                className="h-9 w-28"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm">Timezone</Label>
                            <Input
                                value={timezone}
                                onChange={e => setTimezone(e.target.value)}
                                className="h-9"
                                placeholder="America/New_York"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Meeting types (read-only for now) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Meeting Types</CardTitle>
                    <CardDescription>Available on the public booking page.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {profile.meetingTypes.map(mt => (
                            <div key={mt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium">{mt.name}</p>
                                    <p className="text-xs text-muted-foreground">{mt.description}</p>
                                </div>
                                <Badge variant="outline">{mt.durationMinutes} min</Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="gap-2"
                >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saved && <CheckCircle2 className="h-4 w-4" />}
                    {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
}
