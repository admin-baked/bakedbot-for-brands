'use client';

import { useState } from 'react';
import { MeetingType, TimeSlot, BookingConfirmation } from '@/types/executive-calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Video, Clock, Calendar } from 'lucide-react';

interface Props {
    profileSlug: string;
    meetingType: MeetingType;
    slot: TimeSlot;
    onComplete: (confirmation: BookingConfirmation) => void;
}

export function BookingForm({ profileSlug, meetingType, slot, onComplete }: Props) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [purpose, setPurpose] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !purpose.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/calendar/${profileSlug}/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meetingTypeId: meetingType.id,
                    externalName: name.trim(),
                    externalEmail: email.trim().toLowerCase(),
                    purpose: purpose.trim(),
                    startAt: slot.startAt instanceof Date ? slot.startAt.toISOString() : slot.startAt,
                    endAt: slot.endAt instanceof Date ? slot.endAt.toISOString() : slot.endAt,
                }),
            });

            if (!res.ok) {
                const data = await res.json() as { error?: string };
                throw new Error(data.error || 'Booking failed');
            }

            const confirmation = await res.json() as BookingConfirmation;
            onComplete(confirmation);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6">
            {/* Meeting summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                        {new Intl.DateTimeFormat('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                        }).format(new Date(slot.startAt))}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{meetingType.durationMinutes} minutes · {meetingType.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Video className="h-4 w-4 text-gray-400" />
                    <span>Video meeting (link sent via email)</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-sm font-medium">Your name</Label>
                    <Input
                        id="name"
                        placeholder="Jane Smith"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        disabled={loading}
                        className="h-10"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="jane@company.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        disabled={loading}
                        className="h-10"
                    />
                    <p className="text-xs text-gray-400">Confirmation + video link will be sent here</p>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="purpose" className="text-sm font-medium">What would you like to discuss?</Label>
                    <Textarea
                        id="purpose"
                        placeholder="e.g. I'd like to explore how BakedBot can help with our marketing automation..."
                        value={purpose}
                        onChange={e => setPurpose(e.target.value)}
                        required
                        disabled={loading}
                        rows={3}
                        className="resize-none"
                    />
                </div>

                {error && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
                )}

                <Button
                    type="submit"
                    disabled={loading || !name.trim() || !email.trim() || !purpose.trim()}
                    className="w-full bg-black hover:bg-gray-800 text-white h-11"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Scheduling...
                        </>
                    ) : (
                        'Confirm Meeting'
                    )}
                </Button>

                <p className="text-xs text-center text-gray-400">
                    By booking, you agree that this meeting may be recorded and transcribed for notes.
                </p>
            </form>
        </div>
    );
}
