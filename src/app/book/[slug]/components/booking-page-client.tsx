'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExecutiveProfile, MeetingType, TimeSlot, BookingConfirmation } from '@/types/executive-calendar';
import { SlotPicker } from './slot-picker';
import { BookingForm } from './booking-form';
import { Calendar, Clock, Video, CheckCircle2, ArrowLeft, Globe, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Step = 'type' | 'date' | 'confirm' | 'done';

interface Props {
    profile: ExecutiveProfile;
}

export function BookingPageClient({ profile }: Props) {
    const [step, setStep] = useState<Step>('type');
    const [selectedType, setSelectedType] = useState<MeetingType | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

    const themeColor = profile.themeColor || '#10b981'; // Default emerald

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
        <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-emerald-500/30 selection:text-emerald-400 font-sans pb-20">
            {/* Dynamic Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div 
                    className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 animate-pulse"
                    style={{ backgroundColor: themeColor }}
                />
                <div 
                    className="absolute top-[40%] -right-[10%] w-[30%] h-[30%] rounded-full blur-[100px] opacity-10"
                    style={{ backgroundColor: themeColor }}
                />
            </div>

            <div className="relative max-w-5xl mx-auto px-6 pt-16 lg:pt-24 z-10">
                {/* Profile Header */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="relative inline-block mb-6">
                        {profile.avatarUrl ? (
                            <img
                                src={profile.avatarUrl}
                                alt={profile.displayName}
                                className="w-28 h-28 rounded-full object-cover shadow-2xl ring-4 ring-white/5"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center text-3xl font-bold">
                                {profile.displayName.slice(0, 1)}
                            </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#0a0a0a] flex items-center justify-center border border-white/10 shadow-lg">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                        </div>
                    </div>
                    
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                        {profile.displayName}
                    </h1>
                    <p className="text-emerald-400/90 font-medium tracking-wide uppercase text-xs mb-4">
                        {profile.title}
                    </p>
                    
                    {profile.bio && (
                        <p className="text-gray-400 text-base max-w-md mx-auto leading-relaxed mb-6">
                            {profile.bio}
                        </p>
                    )}
                    
                    <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 font-medium">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                            <Globe className="w-3.5 h-3.5 text-emerald-500" />
                            {profile.availability.timezone.replace('_', ' ')}
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                            <Video className="w-3.5 h-3.5 text-emerald-500" />
                            BakedBot Meet (LiveKit)
                        </div>
                    </div>
                </motion.div>

                {/* Booking Container - Glassmorphic */}
                <motion.div 
                    layout
                    className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                >
                    <AnimatePresence mode="wait">
                        {step === 'type' && (
                            <motion.div 
                                key="step-type"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-8 lg:p-12"
                            >
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                    <h2 className="text-xl font-bold tracking-tight text-white/90">
                                        Select an experience
                                    </h2>
                                </div>
                                
                                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {profile.meetingTypes.map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => handleTypeSelect(type)}
                                            className="group relative transition-all duration-300"
                                        >
                                            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity blur-xl" />
                                            <div className="relative text-left p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] transition-colors">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                                                        <Clock className="h-5 w-5" />
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider border-emerald-500/20 text-emerald-400">
                                                        {type.durationMinutes} MIN
                                                    </Badge>
                                                </div>
                                                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors mb-2">
                                                    {type.name}
                                                </h3>
                                                {type.description && (
                                                    <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors line-clamp-2">
                                                        {type.description}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 'date' && selectedType && (
                            <motion.div 
                                key="step-date"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="flex items-center gap-4 p-6 lg:p-8 border-b border-white/5 bg-white/[0.01]">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setStep('type')}
                                        className="rounded-full bg-white/5 hover:bg-white/10 hover:text-emerald-400 h-10 w-10"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">{selectedType.name}</h2>
                                        <p className="text-xs text-gray-500 font-medium tracking-wide flex items-center gap-1.5 uppercase">
                                            <Clock className="w-3 h-3 text-emerald-500/70" />
                                            {selectedType.durationMinutes} Minutes · Secure Video
                                        </p>
                                    </div>
                                </div>
                                <div className="p-2">
                                    <SlotPicker
                                        profileSlug={profile.profileSlug}
                                        meetingType={selectedType}
                                        timezone={profile.availability.timezone}
                                        availableDows={profile.availability.windows.map(w => w.dayOfWeek)}
                                        onSlotSelect={handleSlotSelect}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {step === 'confirm' && selectedType && selectedSlot && (
                            <motion.div 
                                key="step-confirm"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="flex items-center gap-4 p-8 border-b border-white/5 bg-white/[0.01]">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setStep('date')}
                                        className="rounded-full bg-white/5 hover:bg-white/10 hover:text-emerald-400 h-10 w-10"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Details & Contact</h2>
                                        <p className="text-sm text-emerald-400/80 font-medium">{formatSlotTime(selectedSlot)}</p>
                                    </div>
                                </div>
                                <div className="p-8 lg:p-12">
                                    <BookingForm
                                        profileSlug={profile.profileSlug}
                                        meetingType={selectedType}
                                        slot={selectedSlot}
                                        onComplete={handleBookingComplete}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {step === 'done' && confirmation && (
                            <motion.div 
                                key="step-done"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-12 lg:p-20 text-center"
                            >
                                <div className="relative inline-block mb-10">
                                    <motion.div 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                        className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center border-2 border-emerald-500/50"
                                    >
                                        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                                    </motion.div>
                                    <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-2xl -z-10 animate-pulse" />
                                </div>
                                
                                <h1 className="text-3xl lg:text-4xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                                    It&apos;s digital official.
                                </h1>
                                <p className="text-gray-400 text-lg mb-10 max-w-sm mx-auto font-medium">
                                    Calendar event created and BakedBot confirmation sent to your inbox.
                                </p>

                                <div className="backdrop-blur-md bg-white/[0.03] border border-white/5 rounded-3xl p-8 text-left max-w-md mx-auto mb-10 space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 rounded-lg bg-emerald-500/10">
                                            <Calendar className="h-5 w-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">When</p>
                                            <p className="text-white font-medium">
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
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 rounded-lg bg-emerald-500/10">
                                            <Video className="h-5 w-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Where (BakedBot Meet)</p>
                                            <p className="text-emerald-400 font-mono text-sm break-all">
                                                meet.bakedbot.ai/{confirmation.videoRoomUrl.split('/').pop()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <a
                                        href={confirmation.videoRoomUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block"
                                    >
                                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-[#0a0a0a] px-10 py-6 rounded-2xl text-lg font-bold shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
                                            🎥 Join Meeting Room
                                        </Button>
                                    </a>
                                    <p className="text-xs text-gray-500 font-medium">
                                        Bookmark this page or check your email for the join link.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Secure Footer */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center mt-12 mb-10"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                        <Sparkles className="w-3 h-3 text-emerald-500/50" />
                        Built by BakedBot Intelligence
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

