'use client';

import { useState, useEffect, useCallback } from 'react';
import { MeetingType, TimeSlot } from '@/types/executive-calendar';
import { Calendar } from '@/components/ui/calendar';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    profileSlug: string;
    meetingType: MeetingType;
    timezone: string;
    onSlotSelect: (slot: TimeSlot) => void;
}

function formatSlotTime(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone,
        hour12: true,
    }).format(date);
}

function isSameDay(a: Date, b: Date, timezone: string): boolean {
    const fmt = (d: Date) =>
        new Intl.DateTimeFormat('sv-SE', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    return fmt(a) === fmt(b);
}

export function SlotPicker({ profileSlug, meetingType, timezone, onSlotSelect }: Props) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchSlots = useCallback(async (date: Date) => {
        setLoading(true);
        setSlots([]);
        try {
            const dateStr = new Intl.DateTimeFormat('sv-SE', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(date);

            const res = await fetch(
                `/api/calendar/${profileSlug}/slots?date=${dateStr}&duration=${meetingType.durationMinutes}`,
            );

            if (!res.ok) throw new Error('Failed to load slots');
            const data = await res.json() as { slots: Array<{ startAt: string; endAt: string; available: boolean }> };
            setSlots(
                data.slots.map(s => ({
                    startAt: new Date(s.startAt),
                    endAt: new Date(s.endAt),
                    available: s.available,
                })),
            );
        } catch {
            setSlots([]);
        } finally {
            setLoading(false);
        }
    }, [profileSlug, meetingType.durationMinutes, timezone]);

    useEffect(() => {
        if (selectedDate) {
            void fetchSlots(selectedDate);
        }
    }, [selectedDate, fetchSlots]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {/* Calendar picker */}
            <div className="p-6 flex justify-center">
                <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Select a date</h3>
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            if (date < today) return true;
                            // Disable weekends for simplicity (will refine with actual availability)
                            return false;
                        }}
                        className="rounded-lg border-0"
                        fromDate={new Date()}
                    />
                </div>
            </div>

            {/* Time slots */}
            <div className="p-6">
                {!selectedDate && (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                        <p className="text-sm">Select a date to see available times</p>
                    </div>
                )}

                {selectedDate && loading && (
                    <div className="flex flex-col items-center justify-center h-48">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        <p className="text-sm text-gray-400 mt-2">Loading times...</p>
                    </div>
                )}

                {selectedDate && !loading && slots.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                        <p className="text-sm">No availability on this date.</p>
                        <p className="text-xs mt-1">Try another day</p>
                    </div>
                )}

                {selectedDate && !loading && slots.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-4">
                            {new Intl.DateTimeFormat('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                timeZone: timezone,
                            }).format(selectedDate)}
                            <span className="text-gray-400 font-normal ml-1 text-xs">({timezone.split('/').pop()?.replace('_', ' ')})</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                            {slots.map((slot, i) => (
                                <Button
                                    key={i}
                                    variant="outline"
                                    onClick={() => onSlotSelect(slot)}
                                    className="text-sm border-gray-200 hover:border-black hover:bg-black hover:text-white transition-all"
                                >
                                    {formatSlotTime(slot.startAt, timezone)}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
