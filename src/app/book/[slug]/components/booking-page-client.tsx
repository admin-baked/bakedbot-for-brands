'use client';

import { useState } from 'react';
import { ExecutiveProfile, MeetingType, TimeSlot, BookingConfirmation } from '@/types/executive-calendar';
import { SlotPicker } from './slot-picker';
import { BookingForm } from './booking-form';
import { Calendar, Clock, Video, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Step = 'type' | 'date' | 'confirm' | 'done';

interface Props {
    profile: ExecutiveProfile;
}

export function BookingPageClient({ profile }: Props) {
    const [step, setStep] = useState<Step>('type');
    const [selectedType, setSelectedType] = useState<MeetingType | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

    function formatSlotTime(slot: TimeSlot): string {
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: profile.availability.timezone,
            timeZoneName: 'short',
        }).format(new Date(slot.startAt));
    }

    function handleTypeSelect(type: MeetingType) {
        setSelectedType(type);
        setStep('date');
    }

    function handleSlotSelect(slot: TimeSlot) {
        setSelectedSlot(slot);
        setStep('confirm');
    }

    function handleBookingComplete(conf: BookingConfirmation) {
        setConfirmation(conf);
        setStep('done');
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-10">
            {/* Header */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-black text-white text-xl font-bold mb-4">
                    {profile.displayName.slice(0, 1)}
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{profile.displayName}</h1>
                <p className="text-gray-500 mt-1">{profile.title}</p>
                {profile.bio && (
                    <p className="text-gray-600 text-sm max-w-md mx-auto mt-3">{profile.bio}</p>
                )}
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-500">
                    <span>🌍 {profile.availability.timezone.replace('_', ' ')}</span>
                    <span>·</span>
                    <span>🎥 Video call via BakedBot Meet</span>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Step: Choose meeting type */}
                {step === 'type' && (
                    <div className="p-8">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">
                            What kind of meeting?
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {profile.meetingTypes.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => handleTypeSelect(type)}
                                    className="text-left p-5 border-2 border-gray-200 rounded-xl hover:border-black hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="h-4 w-4 text-gray-400 group-hover:text-black" />
                                        <span className="text-sm font-medium text-gray-500">
                                            {type.durationMinutes} min
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 group-hover:text-black">
                                        {type.name}
                                    </h3>
                                    {type.description && (
                                        <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step: Pick a date + time */}
                {step === 'date' && selectedType && (
                    <div>
                        <div className="flex items-center gap-3 p-6 border-b border-gray-100">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStep('type')}
                                className="h-8 w-8 p-0"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <h2 className="font-semibold text-gray-900">{selectedType.name}</h2>
                                <p className="text-sm text-gray-500">{selectedType.durationMinutes} min · Video</p>
                            </div>
                        </div>
                        <SlotPicker
                            profileSlug={profile.profileSlug}
                            meetingType={selectedType}
                            timezone={profile.availability.timezone}
                            availableDows={profile.availability.windows.map(w => w.dayOfWeek)}
                            onSlotSelect={handleSlotSelect}
                        />
                    </div>
                )}

                {/* Step: Confirm booking details */}
                {step === 'confirm' && selectedType && selectedSlot && (
                    <div>
                        <div className="flex items-center gap-3 p-6 border-b border-gray-100">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStep('date')}
                                className="h-8 w-8 p-0"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <h2 className="font-semibold text-gray-900">Enter your details</h2>
                                <p className="text-sm text-gray-500">{formatSlotTime(selectedSlot)}</p>
                            </div>
                        </div>
                        <BookingForm
                            profileSlug={profile.profileSlug}
                            meetingType={selectedType}
                            slot={selectedSlot}
                            onComplete={handleBookingComplete}
                        />
                    </div>
                )}

                {/* Step: Confirmation */}
                {step === 'done' && confirmation && (
                    <div className="p-10 text-center">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto mb-6">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re booked!</h2>
                        <p className="text-gray-600 mb-6">
                            A confirmation has been sent to your email. We&apos;ll see you then!
                        </p>

                        <div className="bg-gray-50 rounded-xl p-6 text-left max-w-sm mx-auto mb-8 space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                                <span className="text-gray-700">
                                    {new Intl.DateTimeFormat('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        timeZone: confirmation.timezone,
                                        timeZoneName: 'short',
                                    }).format(new Date(confirmation.startAt))}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                                <span className="text-gray-700">{confirmation.durationMinutes} minutes with {confirmation.displayName}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Video className="h-4 w-4 text-gray-400 shrink-0" />
                                <span className="text-gray-700">Video meeting</span>
                            </div>
                        </div>

                        <a
                            href={confirmation.videoRoomUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button className="bg-black hover:bg-gray-800 text-white px-8">
                                🎥 Save Meeting Room Link
                            </Button>
                        </a>

                        <p className="text-xs text-gray-400 mt-4">
                            Use this link at meeting time. No account needed.
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="text-center mt-8 text-sm text-gray-400">
                Powered by{' '}
                <a href="https://bakedbot.ai" className="text-gray-500 hover:text-gray-700">
                    BakedBot AI
                </a>
            </div>
        </div>
    );
}
